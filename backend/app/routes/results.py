from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, schemas
from app.database import get_db

router = APIRouter(prefix="/results", tags=["Results"])

@router.get("", response_model=List[schemas.EvaluationResponse])
def get_all_results(db: Session = Depends(get_db)):
    """Retrieve all evaluation results."""
    return crud.get_all_results(db)

@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Retrieve aggregate analytics over all test results."""
    results = crud.get_all_results(db)
    
    total_tests = len(results)
    if total_tests == 0:
        return {
            "total_tests": 0,
            "best_score": 0,
            "avg_score": 0,
            "total_questions": 0,
            "pie_data": [],
            "bar_data": []
        }
    
    best_score = max(r.accuracy_percent for r in results)
    avg_score = round(sum(r.accuracy_percent for r in results) / total_tests)
    total_questions = sum(r.total for r in results)
    total_correct = sum(r.correct_count for r in results)
    total_wrong = sum(r.wrong_count + r.unanswered_count for r in results)
    
    pie_data = [
        {"name": "Correct", "value": total_correct},
        {"name": "Wrong", "value": total_wrong}
    ]
    
    # Last 8 tests for bar_data (reversed because get_all_results returns desc)
    recent_results = reversed(results[:8])
    bar_data = [
        {"name": f"T{i+1}", "Score": r.accuracy_percent}
        for i, r in enumerate(recent_results)
    ]
    
    return {
        "total_tests": total_tests,
        "best_score": best_score,
        "avg_score": avg_score,
        "total_questions": total_questions,
        "pie_data": pie_data,
        "bar_data": bar_data
    }

@router.get("/{result_id}", response_model=schemas.EvaluationResponse)
def get_result(result_id: str, db: Session = Depends(get_db)):
    """Retrieve a specific evaluation result by ID."""
    result = crud.get_result_by_id(db, result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return result
