"""
Intelligent text chunking for large study materials.

Splits text into overlapping context-aware chunks suitable for sending
to the AI question generator without losing sentence context.
"""

import re
import logging
from typing import List

logger = logging.getLogger(__name__)

# Target chunk size range (characters)
CHUNK_MIN = 1200
CHUNK_TARGET = 2000
CHUNK_MAX = 2500

# Overlap between consecutive chunks to preserve context
OVERLAP = 200


def _split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences using a simple regex heuristic.

    Handles common abbreviations (e.g., Dr., Mr., e.g., i.e., vs.) and
    preserves sentence boundaries without splitting on them.

    Args:
        text: Clean text to split.

    Returns:
        List of sentence strings (non-empty only).
    """
    # Protect common abbreviations from being treated as sentence endings
    abbreviations = r"(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|Fig|et al|approx|vol|no|pp)\."
    placeholder = "__ABBREV__"
    text = re.sub(abbreviations + r"\s", lambda m: m.group().replace(".", placeholder), text)

    # Split on sentence-ending punctuation followed by space + capital or newline
    sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z\[\(])", text)

    # Restore abbreviation dots
    sentences = [s.replace(placeholder, ".") for s in sentences]

    # Also split on double newlines (paragraph breaks) to respect document structure
    result = []
    for s in sentences:
        parts = s.split("\n\n")
        result.extend(p.strip() for p in parts if p.strip())

    return result


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_TARGET,
    overlap: int = OVERLAP,
) -> List[str]:
    """
    Split cleaned text into overlapping chunks for AI processing.

    Strategy:
    - Split text into sentences first to avoid mid-sentence cuts.
    - Accumulate sentences into a chunk until it reaches chunk_size.
    - When a chunk is full, save it and start the next chunk with the
      last `overlap` characters of the previous chunk for context continuity.
    - Any remaining text shorter than CHUNK_MIN is appended to the last chunk.

    Args:
        text: Clean text to chunk.
        chunk_size: Target character size for each chunk (default 2000).
        overlap: Character overlap between consecutive chunks (default 200).

    Returns:
        List of text chunks. Returns a single-element list if text is short.
    """
    if not text:
        return []

    # Short text — return as-is
    if len(text) <= chunk_size:
        logger.info("Text is short (%d chars); returning single chunk.", len(text))
        return [text]

    sentences = _split_into_sentences(text)
    if not sentences:
        return [text]

    chunks: List[str] = []
    current_sentences: List[str] = []
    current_len = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        # If a single sentence is already larger than max, force-split it
        if sentence_len > CHUNK_MAX:
            # Flush current buffer first
            if current_sentences:
                chunks.append(" ".join(current_sentences).strip())
                current_sentences = []
                current_len = 0
            # Hard-split the giant sentence by word boundaries
            words = sentence.split()
            partial = []
            partial_len = 0
            for word in words:
                if partial_len + len(word) + 1 > chunk_size and partial:
                    chunks.append(" ".join(partial).strip())
                    # Overlap: keep last few words
                    overlap_words = partial[-max(1, overlap // 8):]
                    partial = overlap_words + [word]
                    partial_len = sum(len(w) + 1 for w in partial)
                else:
                    partial.append(word)
                    partial_len += len(word) + 1
            if partial:
                current_sentences = partial
                current_len = partial_len
            continue

        # Normal accumulation
        if current_len + sentence_len + 1 > chunk_size and current_sentences:
            chunk_text_val = " ".join(current_sentences).strip()
            chunks.append(chunk_text_val)

            # Start next chunk with overlap from the end of the current chunk
            overlap_text = chunk_text_val[-overlap:] if len(chunk_text_val) > overlap else chunk_text_val
            # Find a clean sentence start in the overlap
            clean_start = re.search(r"(?<=[.!?])\s+", overlap_text)
            if clean_start:
                overlap_text = overlap_text[clean_start.end():]

            current_sentences = [overlap_text, sentence] if overlap_text else [sentence]
            current_len = len(overlap_text) + sentence_len + 1
        else:
            current_sentences.append(sentence)
            current_len += sentence_len + 1

    # Flush remainder
    if current_sentences:
        remainder = " ".join(current_sentences).strip()
        if remainder:
            # If remainder is tiny, append to last chunk
            if chunks and len(remainder) < CHUNK_MIN:
                chunks[-1] = chunks[-1] + "\n\n" + remainder
            else:
                chunks.append(remainder)

    logger.info(
        "Chunked %d chars into %d chunks (target_size=%d, overlap=%d).",
        len(text), len(chunks), chunk_size, overlap,
    )
    return chunks