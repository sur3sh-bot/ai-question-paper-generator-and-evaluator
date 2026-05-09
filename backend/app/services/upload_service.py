"""
Upload service — orchestrates the full document-to-questions pipeline.

Flow:
  upload file → save to disk → extract text → clean text
  → chunk text → generate AI questions → save to DB → return response
"""

import os
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional

from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from app.ai.extractor import extract_text
from app.ai.cleaner import clean_text
from app.ai.chunking import chunk_text
from app.ai.question_generator import generate_questions_from_chunks
from app import crud, schemas

logger = logging.getLogger(__name__)

# ── Constants ──────────────────────────────────────────────────────────────────

SUPPORTED_EXTENSIONS = {"pdf", "docx", "pptx", "ppt", "txt"}
MAX_FILE_SIZE_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", "20")) * 1024 * 1024
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))

# Questions per chunk from env (default: 3 MCQ + 2 fill = 5 per chunk)
MCQ_PER_CHUNK  = int(os.getenv("MCQ_PER_CHUNK", "3"))
FILL_PER_CHUNK = int(os.getenv("FILL_PER_CHUNK", "2"))


def _ensure_upload_dir() -> None:
    """Create the uploads directory if it does not exist."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _validate_file(filename: str, content_length: int) -> str:
    """
    Validate file extension and size.

    Args:
        filename: Original filename from the upload.
        content_length: File size in bytes.

    Returns:
        Lowercased file extension (without dot).

    Raises:
        HTTPException 400: Unsupported file type or file too large.
    """
    ext = Path(filename).suffix.lstrip(".").lower()
    if not ext or ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '.{ext}'. "
                f"Supported types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            ),
        )
    if content_length > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=(
                f"File exceeds the maximum allowed size of "
                f"{MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
            ),
        )
    return ext


def _save_upload(upload: UploadFile, ext: str) -> Path:
    """
    Save the uploaded file to disk with a unique name.

    Args:
        upload: FastAPI UploadFile object.
        ext: Validated lowercase file extension.

    Returns:
        Path to the saved file.

    Raises:
        HTTPException 500: On disk write failure.
    """
    _ensure_upload_dir()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    dest = UPLOAD_DIR / unique_name

    try:
        contents = upload.file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")
        with open(dest, "wb") as fh:
            fh.write(contents)
        logger.info("Saved upload to '%s' (%d bytes).", dest, len(contents))
        return dest
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {exc}") from exc


def _cleanup(file_path: Path) -> None:
    """Silently remove a temporary uploaded file."""
    try:
        if file_path.exists():
            file_path.unlink()
            logger.debug("Removed temporary file '%s'.", file_path)
    except Exception as exc:
        logger.warning("Could not remove temp file '%s': %s", file_path, exc)


def _save_questions_to_db(
    questions: List[Dict[str, Any]],
    db: Session,
    subject: Optional[str] = "General",
) -> List[schemas.QuestionResponse]:
    """
    Persist generated question dicts into the database using existing CRUD logic.

    Skips any question that fails Pydantic validation (logs and continues).

    Args:
        questions: List of validated question dicts from the AI generator.
        db: SQLAlchemy session (injected via FastAPI dependency).

    Returns:
        List of QuestionResponse objects for the API response.
    """
    saved = []
    for q in questions:
        try:
            payload = schemas.QuestionCreate(
                question=q["question"],
                type=q["type"],
                options=q.get("options"),
                correct_answer=q["correct_answer"],
                difficulty=q["difficulty"],
                subject=subject,
            )
            db_question = crud.create_question(db, payload)
            saved.append(schemas.QuestionResponse.model_validate(db_question))
        except Exception as exc:
            logger.warning("Skipping question due to validation error: %s | q=%s", exc, q)
    return saved


async def process_upload(
    upload: UploadFile,
    db: Session,
    mcq_per_chunk: int = MCQ_PER_CHUNK,
    fill_per_chunk: int = FILL_PER_CHUNK,
    subject: Optional[str] = "General",
) -> Dict[str, Any]:
    """
    Full pipeline: file upload → text extraction → cleaning → chunking
    → AI question generation → DB persistence → response.

    Args:
        upload: FastAPI UploadFile from the request.
        db: Injected SQLAlchemy session.
        mcq_per_chunk: MCQ questions to generate per chunk.
        fill_per_chunk: Fill-blank questions per chunk.
        subject: Optional subject tag for all generated questions.

    Returns:
        Dict with status, questions_generated count, chunks_processed,
        filename, and the list of serialised QuestionResponse dicts.

    Raises:
        HTTPException: For validation, extraction, or AI errors.
    """
    filename = upload.filename or "upload"

    # Read size for validation (FastAPI may not populate content_length header)
    file_bytes = upload.file.read()
    file_size = len(file_bytes)
    upload.file.seek(0)  # reset so _save_upload can read again

    ext = _validate_file(filename, file_size)

    # ── 1. Save to disk ───────────────────────────────────────────────────────
    saved_path = _save_upload(upload, ext)

    try:
        # ── 2. Extract text ───────────────────────────────────────────────────
        try:
            raw_text = extract_text(str(saved_path), ext)
        except (ValueError, RuntimeError) as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        # ── 3. Clean text ─────────────────────────────────────────────────────
        cleaned = clean_text(raw_text)
        if not cleaned:
            raise HTTPException(
                status_code=422,
                detail="The document yielded no usable text after cleaning."
            )

        # ── 4. Chunk text ─────────────────────────────────────────────────────
        chunks = chunk_text(cleaned)
        if not chunks:
            raise HTTPException(status_code=422, detail="Text could not be chunked.")

        logger.info(
            "Document '%s': %d chars → %d chunks.",
            filename, len(cleaned), len(chunks),
        )

        # ── 5. Generate AI questions ──────────────────────────────────────────
        try:
            generated = await generate_questions_from_chunks(
                chunks,
                mcq_per_chunk=mcq_per_chunk,
                fill_per_chunk=fill_per_chunk,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=502, detail=str(exc))

        if not generated:
            raise HTTPException(
                status_code=422,
                detail="AI could not generate any valid questions from this document."
            )

        # ── 6. Save to database ───────────────────────────────────────────────
        saved_questions = _save_questions_to_db(generated, db, subject=subject)

        logger.info(
            "Saved %d questions from '%s' to DB.", len(saved_questions), filename
        )

        return {
            "status": "success",
            "filename": filename,
            "chunks_processed": len(chunks),
            "questions_generated": len(saved_questions),
            "questions": [q.model_dump() for q in saved_questions],
        }

    finally:
        # Always clean up the temp file
        _cleanup(saved_path)