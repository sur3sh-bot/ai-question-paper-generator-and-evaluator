"""
CRUD operations and business logic for questions and test management.
"""

import random
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound

from app import models, schemas


# ─── Questions ────

def create_question(db: Session, payload: schemas.QuestionCreate) -> models.Question:
    """
    Insert a new question into the database.

    Args:
        db: SQLAlchemy session.
        payload: Validated question data.

    Returns:
        The newly created Question ORM object.
    """
    question = models.Question(
        question=payload.question,
        type=payload.type,
        options=payload.options,
        correct_answer=payload.correct_answer,
        difficulty=payload.difficulty,
        subject=payload.subject,
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def get_all_questions(
    db: Session,
    difficulty: Optional[str] = None,
    q_type: Optional[str] = None,
    subject: Optional[str] = None,
) -> List[models.Question]:
    """
    Retrieve all questions, with optional filters.

    Args:
        db: SQLAlchemy session.
        difficulty: Optional difficulty filter ('easy', 'medium', 'hard').
        q_type: Optional type filter ('mcq', 'fill_blank').
        subject: Optional subject filter.

    Returns:
        List of Question ORM objects.
    """
    query = db.query(models.Question)
    if difficulty:
        query = query.filter(models.Question.difficulty == difficulty)
    if q_type:
        query = query.filter(models.Question.type == q_type)
    if subject:
        query = query.filter(models.Question.subject == subject)
    return query.all()


def get_question_by_id(db: Session, question_id: str) -> Optional[models.Question]:
    """
    Retrieve a single question by its ID.

    Args:
        db: SQLAlchemy session.
        question_id: UUID string of the question.

    Returns:
        Question ORM object or None if not found.
    """
    return db.query(models.Question).filter(models.Question.id == question_id).first()


def delete_question(db: Session, question_id: str) -> bool:
    """
    Delete a question by ID.

    Args:
        db: SQLAlchemy session.
        question_id: UUID string of the question.

    Returns:
        True if deleted, False if question not found.
    """
    question = get_question_by_id(db, question_id)
    if not question:
        return False
    db.delete(question)
    db.commit()
    return True


# ─── Test Generation ─────

def generate_test(
    db: Session,
    number_of_questions: int,
    difficulty: Optional[str] = None,
    subject: Optional[str] = None,
) -> models.GeneratedTest:
    """
    Randomly select questions and create a new GeneratedTest record.

    - MCQ options are shuffled per question.
    - Correct answers are stored in answer_key (separate from questions_snapshot).
    - Raises ValueError if the question bank has insufficient questions.

    Args:
        db: SQLAlchemy session.
        number_of_questions: How many questions to include.
        difficulty: Optional difficulty filter.

    Returns:
        The persisted GeneratedTest ORM object.
    """
    pool = get_all_questions(db, difficulty=difficulty, subject=subject)

    if len(pool) < number_of_questions:
        raise ValueError(
            f"Not enough questions in the bank. "
            f"Requested {number_of_questions}, available {len(pool)}"
            + (f" with difficulty='{difficulty}'" if difficulty else "")
            + (f" for subject='{subject}'" if subject else "")
        )

    selected: List[models.Question] = random.sample(pool, number_of_questions)

    questions_snapshot = []
    answer_key = {}

    for q in selected:
        answer_key[q.id] = q.correct_answer

        options = None
        if q.type == "mcq" and q.options:
            options = q.options.copy()
            random.shuffle(options)

        questions_snapshot.append({
            "id": q.id,
            "question": q.question,
            "type": q.type,
            "options": options,
            "difficulty": q.difficulty,
            "subject": q.subject,
        })

    # Compute time limit: 2 min per question, min 10 min, max 3 hours
    time_limit = max(600, min(number_of_questions * 120, 10800))

    test = models.GeneratedTest(
        questions_snapshot=questions_snapshot,
        answer_key=answer_key,
        difficulty_filter=difficulty,
        total_questions=number_of_questions,
        time_limit_seconds=time_limit,
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


def get_test_by_id(db: Session, test_id: str) -> Optional[models.GeneratedTest]:
    """
    Retrieve a generated test by its ID.

    Args:
        db: SQLAlchemy session.
        test_id: UUID string of the test.

    Returns:
        GeneratedTest ORM object or None.
    """
    return db.query(models.GeneratedTest).filter(models.GeneratedTest.id == test_id).first()


# ─── Evaluation ──────

def evaluate_test(
    db: Session,
    test_id: str,
    user_answers: List[schemas.UserAnswer],
) -> schemas.EvaluationResponse:
    """
    Evaluate user answers against the stored answer key.

    Comparison rules:
    - MCQ: exact match (case-insensitive, stripped).
    - Fill-in-the-blank: case-insensitive, stripped comparison.

    Args:
        db: SQLAlchemy session.
        test_id: UUID of the test to evaluate.
        user_answers: List of {question_id, answer} pairs.

    Returns:
        EvaluationResponse with full breakdown and analytics.

    Raises:
        ValueError: If test_id not found.
    """
    test = get_test_by_id(db, test_id)
    if not test:
        raise ValueError(f"Test with id '{test_id}' not found")

    answer_key: dict = test.answer_key
    questions_map: dict = {q["id"]: q for q in test.questions_snapshot}

    # Build lookup of submitted answers
    submitted: dict = {ua.question_id: ua.answer for ua in user_answers}

    breakdown = []
    correct_count = 0
    wrong_count = 0
    unanswered_count = 0

    # Analytics counters
    total_mcq = total_fill = 0
    correct_mcq = correct_fill = 0
    diff_totals = {"easy": 0, "medium": 0, "hard": 0}
    diff_correct = {"easy": 0, "medium": 0, "hard": 0}

    for q_id, correct_answer in answer_key.items():
        q_data = questions_map.get(q_id, {})
        q_type = q_data.get("type", "unknown")
        difficulty = q_data.get("difficulty", "medium")
        question_text = q_data.get("question", "")

        diff_totals[difficulty] = diff_totals.get(difficulty, 0) + 1

        if q_type == "mcq":
            total_mcq += 1
        else:
            total_fill += 1

        user_ans = submitted.get(q_id, "").strip()
        user_ans_text = user_ans
        
        if not user_ans:
            unanswered_count += 1
            is_correct = False
        else:
            if q_type == "mcq" and user_ans.upper() in ["A", "B", "C", "D"]:
                mapping = {"A": 0, "B": 1, "C": 2, "D": 3}
                idx = mapping[user_ans.upper()]
                shown_options = q_data.get("options") or []
                if idx < len(shown_options):
                    user_ans_text = shown_options[idx]
            
            is_correct = user_ans_text.lower() == correct_answer.strip().lower()

        if is_correct:
            correct_count += 1
            diff_correct[difficulty] = diff_correct.get(difficulty, 0) + 1
            if q_type == "mcq":
                correct_mcq += 1
            else:
                correct_fill += 1
        elif user_ans:
            wrong_count += 1

        breakdown.append(schemas.AnswerDetail(
            question_id=q_id,
            question_text=question_text,
            question_type=q_type,
            user_answer=user_ans_text if user_ans_text else "(no answer)",
            correct_answer=correct_answer,
            is_correct=is_correct,
        ))

    total = len(answer_key)
    accuracy = round((correct_count / total) * 100, 2) if total > 0 else 0.0

    subjects = {q.get("subject", "General") for q in test.questions_snapshot if q.get("subject")}
    test_subject = list(subjects)[0] if len(subjects) == 1 else "Mixed Subjects" if len(subjects) > 1 else "General"

    analytics = schemas.Analytics(
        total_mcq=total_mcq,
        total_fill_blank=total_fill,
        correct_mcq=correct_mcq,
        correct_fill_blank=correct_fill,
        easy_correct=diff_correct.get("easy", 0),
        medium_correct=diff_correct.get("medium", 0),
        hard_correct=diff_correct.get("hard", 0),
        easy_total=diff_totals.get("easy", 0),
        medium_total=diff_totals.get("medium", 0),
        hard_total=diff_totals.get("hard", 0),
        unanswered=unanswered_count,
        test_subject=test_subject,
    )

    result_record = models.TestResult(
        test_id=test_id,
        score=correct_count,
        total=total,
        accuracy_percent=int(accuracy),
        correct_count=correct_count,
        wrong_count=wrong_count,
        unanswered_count=unanswered_count,
        breakdown=[b.model_dump() for b in breakdown],
        analytics=analytics.model_dump(),
    )
    db.add(result_record)
    db.commit()
    db.refresh(result_record)

    return schemas.EvaluationResponse(
        id=result_record.id,
        test_id=test_id,
        score=correct_count,
        total=total,
        accuracy_percent=accuracy,
        correct_count=correct_count,
        wrong_count=wrong_count,
        unanswered_count=unanswered_count,
        breakdown=breakdown,
        analytics=analytics,
        created_at=result_record.created_at,
    )

def get_all_results(db: Session):
    return db.query(models.TestResult).order_by(models.TestResult.created_at.desc()).all()

def get_result_by_id(db: Session, result_id: str):
    return db.query(models.TestResult).filter(models.TestResult.id == result_id).first()
