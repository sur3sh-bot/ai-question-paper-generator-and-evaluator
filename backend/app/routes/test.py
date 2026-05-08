"""
Routes for test generation.

Example cURL requests:
  # Generate a 5-question test (any difficulty)
  curl -X POST http://localhost:8000/generate-test \
    -H "Content-Type: application/json" \
    -d '{"number_of_questions": 5}'

  # Generate a 3-question easy test
  curl -X POST http://localhost:8000/generate-test \
    -H "Content-Type: application/json" \
    -d '{"number_of_questions": 3, "difficulty": "easy"}'

  # Get a previously generated test
  curl http://localhost:8000/generate-test/<test_id>
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/generate-test", tags=["Test Generation"])


@router.post("", response_model=schemas.GeneratedTestResponse, status_code=201)
def generate_test(payload: schemas.GenerateTestRequest, db: Session = Depends(get_db)):
    """
    Generate a randomized question paper.

    - Randomly selects questions from the bank.
    - Optionally filters by difficulty.
    - Shuffles MCQ options so answer order is randomized.
    - Returns the test without correct answers.
    - Computes a time limit (2 min/question, min 10 min, max 3 hours).
    """
    try:
        test = crud.generate_test(
            db,
            number_of_questions=payload.number_of_questions,
            difficulty=payload.difficulty,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return schemas.GeneratedTestResponse(
        test_id=test.id,
        questions=[schemas.QuestionPublic(**q) for q in test.questions_snapshot],
        total_questions=test.total_questions,
        difficulty_filter=test.difficulty_filter,
        time_limit_seconds=test.time_limit_seconds,
        created_at=test.created_at,
    )


@router.get("", response_model=List[schemas.GeneratedTestResponse])
def list_tests(db: Session = Depends(get_db)):
    """Retrieve all generated tests."""
    tests = db.query(models.GeneratedTest).order_by(models.GeneratedTest.created_at.desc()).all()
    return [
        schemas.GeneratedTestResponse(
            test_id=test.id,
            questions=[schemas.QuestionPublic(**q) for q in test.questions_snapshot],
            total_questions=test.total_questions,
            difficulty_filter=test.difficulty_filter,
            time_limit_seconds=test.time_limit_seconds,
            created_at=test.created_at,
        )
        for test in tests
    ]

@router.get("/{test_id}", response_model=schemas.GeneratedTestResponse)
def get_test(test_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a previously generated test by its ID.
    Answers are never exposed in this response.
    """
    test = crud.get_test_by_id(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail=f"Test '{test_id}' not found")

    return schemas.GeneratedTestResponse(
        test_id=test.id,
        questions=[schemas.QuestionPublic(**q) for q in test.questions_snapshot],
        total_questions=test.total_questions,
        difficulty_filter=test.difficulty_filter,
        time_limit_seconds=test.time_limit_seconds,
        created_at=test.created_at,
    )
