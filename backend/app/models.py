"""
SQLAlchemy ORM models for the question bank and generated tests.
"""

import uuid
from sqlalchemy import Column, String, Text, Enum, DateTime, JSON, Integer
from sqlalchemy.sql import func
from app.database import Base


def generate_uuid():
    """Generate a new UUID string."""
    return str(uuid.uuid4())


class Question(Base):
    """
    Represents a question in the question bank.
    Supports both MCQ and fill-in-the-blank question types.
    """
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    question = Column(Text, nullable=False)
    type = Column(Enum("mcq", "fill_blank", name="question_type"), nullable=False)
    options = Column(JSON, nullable=True)           # List of strings for MCQ; null for fill_blank
    correct_answer = Column(String, nullable=False)
    difficulty = Column(Enum("easy", "medium", "hard", name="difficulty_level"), nullable=False)
    subject = Column(String, nullable=True, default="General")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GeneratedTest(Base):
    """
    Represents a generated test session with a snapshot of questions (without answers).
    Stores the full question data so tests are self-contained and reproducible.
    """
    __tablename__ = "generated_tests"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    questions_snapshot = Column(JSON, nullable=False)   # List of question dicts (no answers)
    answer_key = Column(JSON, nullable=False)           # {question_id: correct_answer}
    difficulty_filter = Column(String, nullable=True)
    total_questions = Column(Integer, nullable=False)
    time_limit_seconds = Column(Integer, nullable=False, default=1800)  # 30 min default
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TestResult(Base):
    """
    Stores the evaluation result of a submitted test.
    """
    __tablename__ = "test_results"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    test_id = Column(String, index=True)
    score = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)
    accuracy_percent = Column(Integer, nullable=False)
    correct_count = Column(Integer, nullable=False)
    wrong_count = Column(Integer, nullable=False)
    unanswered_count = Column(Integer, nullable=False)
    breakdown = Column(JSON, nullable=False)
    analytics = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
