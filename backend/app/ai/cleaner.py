"""
Text cleaning and normalization utilities.

Prepares raw extracted text for chunking and AI processing.
"""

import re
import unicodedata
import logging

logger = logging.getLogger(__name__)


def clean_text(text: str) -> str:
    """
    Clean and normalize raw extracted text for downstream processing.

    Operations performed (in order):
    1. Unicode normalization (NFKC) — fixes ligatures, special chars
    2. Remove null bytes and non-printable control characters (except newlines/tabs)
    3. Normalize Windows/Mac line endings to Unix \\n
    4. Collapse tab characters to a single space
    5. Remove lines that contain only punctuation, numbers, or symbols (page headers/footers)
    6. Strip leading/trailing whitespace from each line
    7. Collapse 3+ consecutive blank lines to 2
    8. Collapse 2+ consecutive spaces to 1
    9. Final strip

    Args:
        text: Raw text string from extraction.

    Returns:
        Cleaned, normalized text string.
    """
    if not text:
        return ""

    # 1. Unicode normalization
    text = unicodedata.normalize("NFKC", text)

    # 2. Remove null bytes and non-printable control characters (keep \n \r \t)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", " ", text)

    # 3. Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # 4. Tabs → space
    text = text.replace("\t", " ")

    # 5. Strip each line; remove lines that are purely decorative
    #    (e.g. "--------", "........", "1", "Page 2", "© 2024")
    lines = []
    for line in text.split("\n"):
        stripped = line.strip()
        # Skip lines that are only punctuation/symbols/digits with no real words
        if stripped and re.fullmatch(r"[\W\d]+", stripped) and len(stripped) < 10:
            continue
        lines.append(stripped)
    text = "\n".join(lines)

    # 6. Collapse 3+ blank lines → 2 blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # 7. Collapse multiple spaces
    text = re.sub(r" {2,}", " ", text)

    # 8. Final strip
    text = text.strip()

    logger.debug("Cleaned text: %d chars after cleaning.", len(text))
    return text