"""
Reusable prompt templates for AI question generation.

All prompts enforce strict JSON output so responses can be parsed
deterministically without post-processing heuristics.
"""

from string import Template


# ─── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are an expert educational assessment designer with deep expertise in creating \
high-quality exam questions from study material.

Your output MUST always be valid, parseable JSON — nothing else.
Do NOT include markdown code fences (```json), explanations, or any text outside the JSON.
Do NOT truncate the output.
"""


# ─── MCQ Prompt ────────────────────────────────────────────────────────────────

MCQ_PROMPT_TEMPLATE = Template("""\
Generate exactly $count multiple-choice questions based on the following study material.

RULES:
- Each question must be self-contained and answerable from the text below.
- Provide exactly 4 options per question (labeled A, B, C, D — store ONLY the option text, not the label).
- The correct_answer must exactly match one of the 4 options.
- Difficulty: distribute across "easy", "medium", "hard" naturally.
- topic: a 1–3 word subject label extracted from the content.
- Do NOT number the questions.
- Do NOT add any explanation outside the JSON.

OUTPUT FORMAT (strict JSON array — no markdown, no preamble):
[
  {
    "question_text": "...",
    "type": "mcq",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correct_answer": "Option A text",
    "difficulty": "easy",
    "topic": "topic label"
  }
]

STUDY MATERIAL:
$content
""")


# ─── Fill-in-the-Blank Prompt ──────────────────────────────────────────────────

FILL_BLANK_PROMPT_TEMPLATE = Template("""\
Generate exactly $count fill-in-the-blank questions based on the following study material.

RULES:
- Each question must use ___ (three underscores) to denote the blank.
- The correct_answer must be a single word or short phrase (max 5 words).
- The answer must be directly supported by the text below — no inference needed.
- Difficulty: distribute across "easy", "medium", "hard" naturally.
- topic: a 1–3 word subject label extracted from the content.
- options: must be null for fill-in-the-blank questions.
- Do NOT number the questions.
- Do NOT add any explanation outside the JSON.

OUTPUT FORMAT (strict JSON array — no markdown, no preamble):
[
  {
    "question_text": "The capital of France is ___.",
    "type": "fill_blank",
    "options": null,
    "correct_answer": "Paris",
    "difficulty": "easy",
    "topic": "geography"
  }
]

STUDY MATERIAL:
$content
""")


def build_mcq_prompt(content: str, count: int = 3) -> str:
    """
    Render the MCQ generation prompt.

    Args:
        content: The study material text chunk.
        count: Number of MCQ questions to generate.

    Returns:
        Rendered prompt string ready to send as the user message.
    """
    return MCQ_PROMPT_TEMPLATE.substitute(content=content, count=count)


def build_fill_blank_prompt(content: str, count: int = 2) -> str:
    """
    Render the fill-in-the-blank generation prompt.

    Args:
        content: The study material text chunk.
        count: Number of fill-blank questions to generate.

    Returns:
        Rendered prompt string ready to send as the user message.
    """
    return FILL_BLANK_PROMPT_TEMPLATE.substitute(content=content, count=count)