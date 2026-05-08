"""
Pydantic schemas for request validation and response serialization.
"""

from __future__ import annotations
from typing import List, Optional, Dict
from pydantic import BaseModel, field_validator, model_validator
from datetime import datetime


# ─── Question Schemas ──────

class QuestionCreate(BaseModel):
    """Schema for creating a new question."""
    question: str
    type: str   # "mcq" or "fill_blank"
    options: Optional[List[str]] = None
    correct_answer: str
    difficulty: str  # "easy", "medium", "hard"

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        """Ensure question type is one of the allowed values."""
        if v not in ("mcq", "fill_blank"):
            raise ValueError("type must be 'mcq' or 'fill_blank'")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        """Ensure difficulty is one of the allowed values."""
        if v not in ("easy", "medium", "hard"):
            raise ValueError("difficulty must be 'easy', 'medium', or 'hard'")
        return v

    @model_validator(mode="after")
    def validate_mcq_options(self):
        """MCQ questions must have at least 2 options."""
        if self.type == "mcq":
            if not self.options or len(self.options) < 2:
                raise ValueError("MCQ questions must have at least 2 options")
            
            ans = self.correct_answer.strip().upper()
            mapping = {"A": 0, "B": 1, "C": 2, "D": 3}
            if ans in mapping:
                idx = mapping[ans]
                if idx < len(self.options):
                    self.correct_answer = self.options[idx]
                    
            if self.correct_answer not in self.options:
                raise ValueError("correct_answer must be one of the provided options")
        return self


class QuestionResponse(BaseModel):
    """Schema for returning a question (includes all fields)."""
    id: str
    question: str
    type: str
    options: Optional[List[str]] = None
    correct_answer: str
    difficulty: str
    created_at: datetime

    model_config = {"from_attributes": True}


class QuestionPublic(BaseModel):
    """Question as shown in a test — no correct_answer exposed."""
    id: str
    question: str
    type: str
    options: Optional[List[str]] = None
    difficulty: str

    model_config = {"from_attributes": True}


# ─── Test Generation Schemas ───────────────────────────────────────────────────

class GenerateTestRequest(BaseModel):
    """Request body for generating a test."""
    number_of_questions: int
    difficulty: Optional[str] = None  # If None, mix all difficulties

    @field_validator("number_of_questions")
    @classmethod
    def validate_count(cls, v):
        """Test must request at least 1 question."""
        if v < 1:
            raise ValueError("number_of_questions must be at least 1")
        return v

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        """Validate optional difficulty filter."""
        if v is not None and v not in ("easy", "medium", "hard"):
            raise ValueError("difficulty must be 'easy', 'medium', or 'hard'")
        return v


class GeneratedTestResponse(BaseModel):
    """Response returned after generating a test."""
    test_id: str
    questions: List[QuestionPublic]
    total_questions: int
    difficulty_filter: Optional[str]
    time_limit_seconds: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Evaluation Schemas ────────────────────────────────────────────────────────

class UserAnswer(BaseModel):
    """A single user answer mapped to a question id."""
    question_id: str
    answer: str


class EvaluateRequest(BaseModel):
    """Request body for evaluating a submitted test."""
    test_id: str
    user_answers: List[UserAnswer]


class AnswerDetail(BaseModel):
    """Per-question evaluation breakdown."""
    question_id: str
    question_text: str
    question_type: str
    user_answer: str
    correct_answer: str
    is_correct: bool


class Analytics(BaseModel):
    """Analytics summary for the evaluation response."""
    total_mcq: int
    total_fill_blank: int
    correct_mcq: int
    correct_fill_blank: int
    easy_correct: int
    medium_correct: int
    hard_correct: int
    easy_total: int
    medium_total: int
    hard_total: int
    unanswered: int


class EvaluationResponse(BaseModel):
    """Full evaluation result returned to the client."""
    id: str
    test_id: str
    score: int
    total: int
    accuracy_percent: float
    correct_count: int
    wrong_count: int
    unanswered_count: int
    breakdown: List[AnswerDetail]
    analytics: Analytics
    created_at: datetime
    
    model_config = {"from_attributes": True}

