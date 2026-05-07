"""
Routes for test evaluation.

Example cURL request:
  curl -X POST http://localhost:8000/evaluate \
    -H "Content-Type: application/json" \
    -d '{
      "test_id": "<test_id>",
      "user_answers": [
        {"question_id": "<q_id_1>", "answer": "4"},
        {"question_id": "<q_id_2>", "answer": "Paris"},
        {"question_id": "<q_id_3>", "answer": "Photosynthesis"}
      ]
    }'
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/evaluate", tags=["Evaluation"])


@router.post("", response_model=schemas.EvaluationResponse)
def evaluate_submission(payload: schemas.EvaluateRequest, db: Session = Depends(get_db)):
    """
    Evaluate a submitted test.

    Matching rules:
    - MCQ: case-insensitive exact match.
    - Fill-in-the-blank: case-insensitive, stripped exact match.

    Returns:
    - score, total, accuracy_percent
    - correct_count, wrong_count, unanswered_count
    - Per-question breakdown (is_correct, user_answer, correct_answer)
    - Analytics broken down by question type and difficulty
    """
    if not payload.user_answers:
        raise HTTPException(status_code=422, detail="user_answers cannot be empty")

    try:
        result = crud.evaluate_test(
            db,
            test_id=payload.test_id,
            user_answers=payload.user_answers,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return result
