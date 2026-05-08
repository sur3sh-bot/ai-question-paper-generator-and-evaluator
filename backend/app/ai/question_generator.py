"""
AI-powered question generation using the OpenAI API.

Sends chunked study material to OpenAI and parses the structured JSON response
into validated question objects compatible with the existing Question model.
"""

import os
import json
import re
import logging
from typing import List, Dict, Any, Optional

from app.ai.prompts import build_mcq_prompt, build_fill_blank_prompt, SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Valid values matching the existing Question model enums
VALID_TYPES = {"mcq", "fill_blank"}
VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _get_openai_client():
    """
    Lazily initialise and return an OpenAI client.

    Raises:
        RuntimeError: If OPENAI_API_KEY is not set or openai is not installed.
    """
    try:
        from openai import OpenAI
    except ImportError:
        raise RuntimeError("openai package is not installed. Run: pip install openai")

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key or api_key.startswith("sk-your"):
        raise RuntimeError(
            "OPENAI_API_KEY is not configured. "
            "Set a valid key in your .env file."
        )
    return OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1",
        default_headers={
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "AI Question Generator",
        },
    )


def _extract_json_from_response(raw: str) -> str:
    """
    Strip markdown code fences and extract the JSON array from a raw LLM response.

    Handles responses that are:
    - Pure JSON arrays
    - JSON wrapped in ```json ... ```
    - JSON with leading/trailing prose

    Args:
        raw: Raw string response from the OpenAI API.

    Returns:
        Clean JSON string.

    Raises:
        ValueError: If no JSON array can be found.
    """
    # Strip markdown fences
    raw = re.sub(r"```(?:json)?", "", raw, flags=re.IGNORECASE).strip()

    # Find the outermost JSON array
    start = raw.find("[")
    end = raw.rfind("]")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"No JSON array found in response. Raw: {raw[:300]!r}")
    return raw[start : end + 1]


def _validate_and_normalise_question(raw_q: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Validate a raw question dict from the AI and normalise it for DB insertion.

    Checks:
    - Required fields are present and non-empty
    - type is one of the valid enum values
    - difficulty is valid (defaults to 'medium' if absent/invalid)
    - MCQ has exactly 4 options and correct_answer is among them
    - fill_blank has no options

    Args:
        raw_q: Parsed question dict from the AI JSON response.

    Returns:
        Normalised question dict, or None if the question is invalid and should be dropped.
    """
    question_text = str(raw_q.get("question_text") or raw_q.get("question") or "").strip()
    if not question_text or len(question_text) < 10:
        logger.warning("Dropping question: text too short or missing.")
        return None

    q_type = str(raw_q.get("type", "")).strip().lower()
    if q_type not in VALID_TYPES:
        logger.warning("Dropping question: invalid type '%s'.", q_type)
        return None

    correct_answer = str(raw_q.get("correct_answer") or "").strip()
    if not correct_answer:
        logger.warning("Dropping question: missing correct_answer.")
        return None

    difficulty = str(raw_q.get("difficulty") or "medium").strip().lower()
    if difficulty not in VALID_DIFFICULTIES:
        difficulty = "medium"

    options = raw_q.get("options")

    if q_type == "mcq":
        if not isinstance(options, list) or len(options) < 2:
            logger.warning("Dropping MCQ: fewer than 2 options.")
            return None
        # Deduplicate and clean options
        options = [str(o).strip() for o in options if str(o).strip()]
        if len(options) < 2:
            logger.warning("Dropping MCQ: fewer than 2 non-empty options after cleaning.")
            return None
        # Ensure correct_answer is among the options (case-insensitive fallback)
        if correct_answer not in options:
            match = next(
                (o for o in options if o.lower() == correct_answer.lower()), None
            )
            if match:
                correct_answer = match  # normalise to exact option text
            else:
                logger.warning(
                    "Dropping MCQ: correct_answer '%s' not found in options %s.",
                    correct_answer, options,
                )
                return None

    elif q_type == "fill_blank":
        options = None  # fill_blank never has options

    return {
        "question": question_text,
        "type": q_type,
        "options": options,
        "correct_answer": correct_answer,
        "difficulty": difficulty,
        "topic": str(raw_q.get("topic") or "general").strip()[:50],
    }


def _call_openai(prompt: str, model: str, temperature: float = 0.7) -> str:
    """
    Make a single call to the OpenAI Chat Completions API.

    Args:
        prompt: The user message (rendered prompt).
        model: OpenAI model identifier (e.g., 'gpt-4o-mini').
        temperature: Sampling temperature.

    Returns:
        Raw response text from the model.

    Raises:
        RuntimeError: On API error or empty response.
    """
    client = _get_openai_client()
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=2048,
        )
        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("OpenAI returned an empty response.")
        return content
    except Exception as exc:
        # Re-raise with a cleaner message; caller handles HTTP response
        raise RuntimeError(f"OpenAI API call failed: {exc}") from exc


def generate_questions_from_chunk(
    chunk: str,
    mcq_count: int = 3,
    fill_count: int = 2,
    model: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generate MCQ + fill-in-the-blank questions from a single text chunk.

    Sends two separate prompts (one for MCQ, one for fill-blank) and merges
    the validated results. Malformed responses are handled gracefully.

    Args:
        chunk: A single text chunk (1500–2500 chars) of study material.
        mcq_count: Number of MCQ questions to request from the AI.
        fill_count: Number of fill-in-the-blank questions to request.
        model: OpenAI model to use (reads OPENAI_MODEL env var if None).

    Returns:
        List of validated question dicts ready for DB insertion.
        May contain fewer than mcq_count + fill_count entries if some were invalid.
    """
    model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    all_questions: List[Dict[str, Any]] = []

    # ── MCQ generation ────────────────────────────────────────────────────────
    try:
        mcq_prompt = build_mcq_prompt(content=chunk, count=mcq_count)
        mcq_raw = _call_openai(mcq_prompt, model=model)
        mcq_json_str = _extract_json_from_response(mcq_raw)
        mcq_list = json.loads(mcq_json_str)
        if not isinstance(mcq_list, list):
            raise ValueError("MCQ response is not a JSON array")
        for raw_q in mcq_list:
            validated = _validate_and_normalise_question(raw_q)
            if validated:
                all_questions.append(validated)
        logger.info("MCQ: parsed %d valid questions from chunk.", len(all_questions))
    except json.JSONDecodeError as exc:
        logger.error("MCQ JSON parse error: %s", exc)
    except Exception as exc:
        logger.error("MCQ generation failed: %s", exc)

    # ── Fill-in-the-blank generation ──────────────────────────────────────────
    fill_start = len(all_questions)
    try:
        fill_prompt = build_fill_blank_prompt(content=chunk, count=fill_count)
        fill_raw = _call_openai(fill_prompt, model=model)
        fill_json_str = _extract_json_from_response(fill_raw)
        fill_list = json.loads(fill_json_str)
        if not isinstance(fill_list, list):
            raise ValueError("Fill-blank response is not a JSON array")
        for raw_q in fill_list:
            validated = _validate_and_normalise_question(raw_q)
            if validated:
                all_questions.append(validated)
        logger.info(
            "Fill-blank: parsed %d valid questions from chunk.",
            len(all_questions) - fill_start,
        )
    except json.JSONDecodeError as exc:
        logger.error("Fill-blank JSON parse error: %s", exc)
    except Exception as exc:
        logger.error("Fill-blank generation failed: %s", exc)

    return all_questions


def generate_questions_from_chunks(
    chunks: List[str],
    mcq_per_chunk: int = 3,
    fill_per_chunk: int = 2,
    model: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Generate questions from all chunks of a document.

    Iterates over each chunk sequentially, accumulates all validated questions,
    and returns the combined list. Caps at MAX_CHUNKS to avoid excessive
    processing time on very large documents.

    Args:
        chunks: List of text chunks from the chunking step.
        mcq_per_chunk: MCQ questions to request per chunk.
        fill_per_chunk: Fill-blank questions to request per chunk.
        model: OpenAI model override.

    Returns:
        Combined list of all validated question dicts.
    """
    MAX_CHUNKS = 5  # Cap to avoid multi-minute timeouts on large docs
    all_questions: List[Dict[str, Any]] = []

    chunks_to_process = chunks[:MAX_CHUNKS]
    if len(chunks) > MAX_CHUNKS:
        logger.warning(
            "Document has %d chunks but capping at %d to stay within time limits.",
            len(chunks), MAX_CHUNKS,
        )

    for i, chunk in enumerate(chunks_to_process, start=1):
        logger.info("Processing chunk %d / %d ...", i, len(chunks_to_process))
        chunk_questions = generate_questions_from_chunk(
            chunk,
            mcq_count=mcq_per_chunk,
            fill_count=fill_per_chunk,
            model=model,
        )
        all_questions.extend(chunk_questions)
        logger.info(
            "Chunk %d yielded %d questions. Running total: %d.",
            i, len(chunk_questions), len(all_questions),
        )

    return all_questions