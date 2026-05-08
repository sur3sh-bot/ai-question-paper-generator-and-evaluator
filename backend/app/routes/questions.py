"""
Routes for Question Bank management.

Example cURL requests:
  # Add a question
  curl -X POST http://localhost:8000/questions \
    -H "Content-Type: application/json" \
    -d '{"question":"What is 2+2?","type":"mcq","options":["2","3","4","5"],"correct_answer":"4","difficulty":"easy"}'

  # Get all questions
  curl http://localhost:8000/questions

  # Get questions filtered by difficulty
  curl "http://localhost:8000/questions?difficulty=easy"

  # Delete a question
  curl -X DELETE http://localhost:8000/questions/<id>
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud, schemas, models
from app.database import get_db

router = APIRouter(prefix="/questions", tags=["Questions"])


@router.post("", response_model=schemas.QuestionResponse, status_code=201)
def add_question(payload: schemas.QuestionCreate, db: Session = Depends(get_db)):
    """
    Add a new question to the question bank.

    - MCQ must include options (≥2) and correct_answer must be one of the options.
    - fill_blank questions do not require options.
    """
    return crud.create_question(db, payload)


@router.get("", response_model=List[schemas.QuestionResponse])
def list_questions(
    difficulty: Optional[str] = Query(None, description="Filter by difficulty: easy, medium, hard"),
    type: Optional[str] = Query(None, description="Filter by type: mcq, fill_blank"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all questions from the question bank.
    Supports optional filtering by difficulty and/or question type.
    """
    if difficulty and difficulty not in ("easy", "medium", "hard"):
        raise HTTPException(status_code=422, detail="difficulty must be 'easy', 'medium', or 'hard'")
    if type and type not in ("mcq", "fill_blank"):
        raise HTTPException(status_code=422, detail="type must be 'mcq' or 'fill_blank'")

    return crud.get_all_questions(db, difficulty=difficulty, q_type=type)


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Return stats for the dashboard."""
    total = db.query(models.Question).count()
    mcq = db.query(models.Question).filter(models.Question.type == "mcq").count()
    fill_blank = db.query(models.Question).filter(models.Question.type == "fill_blank").count()
    
    # Calculate avg score from TestResult table
    results = db.query(models.TestResult).all()
    avg_score = 0
    if results:
        avg_score = round(sum(r.accuracy_percent for r in results) / len(results))
        
    return {
        "total": total,
        "mcq": mcq,
        "fill_blank": fill_blank,
        "avg_score": avg_score
    }


@router.get("/{question_id}", response_model=schemas.QuestionResponse)
def get_question(question_id: str, db: Session = Depends(get_db)):
    """
    Retrieve a single question by its ID.
    Returns 404 if the question does not exist.
    """
    q = crud.get_question_by_id(db, question_id)
    if not q:
        raise HTTPException(status_code=404, detail=f"Question '{question_id}' not found")
    return q


@router.delete("/{question_id}", status_code=204)
def remove_question(question_id: str, db: Session = Depends(get_db)):
    """
    Delete a question by its ID.
    Returns 404 if the question does not exist.
    """
    deleted = crud.delete_question(db, question_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Question '{question_id}' not found")
