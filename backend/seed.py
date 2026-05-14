"""
Seed script — populates the question bank with 20 sample questions.

Usage:
    cd backend
    python seed.py
"""

import sys # Needed for modifying the system path to import local modules
import os

# Allow running from the backend/ directory
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal, engine
from app import models, crud, schemas

models.Base.metadata.create_all(bind=engine)

SAMPLE_QUESTIONS = [
    # ── Easy MCQ ──────────────────────────────────────────────────────────────
    {
        "question": "What is the capital of France?",
        "type": "mcq",
        "options": ["Berlin", "Madrid", "Paris", "Rome"],
        "correct_answer": "Paris",
        "difficulty": "easy",
    },
    {
        "question": "Which planet is known as the Red Planet?",
        "type": "mcq",
        "options": ["Earth", "Mars", "Jupiter", "Venus"],
        "correct_answer": "Mars",
        "difficulty": "easy",
    },
    {
        "question": "What is 2 + 2?",
        "type": "mcq",
        "options": ["3", "4", "5", "6"],
        "correct_answer": "4",
        "difficulty": "easy",
    },
    {
        "question": "Which gas do plants absorb during photosynthesis?",
        "type": "mcq",
        "options": ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"],
        "correct_answer": "Carbon Dioxide",
        "difficulty": "easy",
    },
    {
        "question": "How many days are in a week?",
        "type": "mcq",
        "options": ["5", "6", "7", "8"],
        "correct_answer": "7",
        "difficulty": "easy",
    },
    # ── Medium MCQ ────────────────────────────────────────────────────────────
    {
        "question": "What does CPU stand for?",
        "type": "mcq",
        "options": [
            "Central Processing Unit",
            "Computer Personal Unit",
            "Central Peripheral Unit",
            "Core Processing Unit",
        ],
        "correct_answer": "Central Processing Unit",
        "difficulty": "medium",
    },
    {
        "question": "Which data structure operates on a LIFO principle?",
        "type": "mcq",
        "options": ["Queue", "Stack", "Linked List", "Tree"],
        "correct_answer": "Stack",
        "difficulty": "medium",
    },
    {
        "question": "What is the time complexity of binary search?",
        "type": "mcq",
        "options": ["O(n)", "O(n²)", "O(log n)", "O(1)"],
        "correct_answer": "O(log n)",
        "difficulty": "medium",
    },
    {
        "question": "Which HTTP method is used to update a resource?",
        "type": "mcq",
        "options": ["GET", "POST", "PUT", "DELETE"],
        "correct_answer": "PUT",
        "difficulty": "medium",
    },
    {
        "question": "What year was Python first released?",
        "type": "mcq",
        "options": ["1985", "1991", "1998", "2002"],
        "correct_answer": "1991",
        "difficulty": "medium",
    },
    # ── Hard MCQ ──────────────────────────────────────────────────────────────
    {
        "question": "Which algorithm is used in Dijkstra's shortest path?",
        "type": "mcq",
        "options": ["BFS", "DFS", "Greedy", "Dynamic Programming"],
        "correct_answer": "Greedy",
        "difficulty": "hard",
    },
    {
        "question": "What is the CAP theorem about?",
        "type": "mcq",
        "options": [
            "CPU, Arithmetic, Processing",
            "Consistency, Availability, Partition tolerance",
            "Caching, Authorization, Proxy",
            "Clustering, Aggregation, Partitioning",
        ],
        "correct_answer": "Consistency, Availability, Partition tolerance",
        "difficulty": "hard",
    },
    {
        "question": "In Big-O notation, which is the fastest growing complexity?",
        "type": "mcq",
        "options": ["O(n log n)", "O(2ⁿ)", "O(n³)", "O(n!)"],
        "correct_answer": "O(n!)",
        "difficulty": "hard",
    },
    # ── Easy Fill-in-the-Blank ────────────────────────────────────────────────
    {
        "question": "The process by which plants make food using sunlight is called ___.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "photosynthesis",
        "difficulty": "easy",
    },
    {
        "question": "Water boils at ___ degrees Celsius at sea level.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "100",
        "difficulty": "easy",
    },
    {
        "question": "The chemical symbol for gold is ___.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "Au",
        "difficulty": "easy",
    },
    # ── Medium Fill-in-the-Blank ──────────────────────────────────────────────
    {
        "question": "The design pattern that restricts instantiation of a class to one object is called ___.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "singleton",
        "difficulty": "medium",
    },
    {
        "question": "In SQL, the ___ clause is used to filter groups after aggregation.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "HAVING",
        "difficulty": "medium",
    },
    # ── Hard Fill-in-the-Blank ────────────────────────────────────────────────
    {
        "question": "The theorem stating that no three positive integers a, b, c satisfy aⁿ+bⁿ=cⁿ for n>2 is called Fermat's ___ Theorem.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "Last",
        "difficulty": "hard",
    },
    {
        "question": "The Python keyword used to create a generator function is ___.",
        "type": "fill_blank",
        "options": None,
        "correct_answer": "yield",
        "difficulty": "hard",
    },
]


def seed():
    """Insert all sample questions into the database, skipping if already seeded."""
    db = SessionLocal()
    try:
        existing = db.query(models.Question).count()
        if existing > 0:
            print(f"Database already contains {existing} questions. Skipping seed.")
            return

        for q_data in SAMPLE_QUESTIONS:
            payload = schemas.QuestionCreate(**q_data)
            crud.create_question(db, payload)

        total = db.query(models.Question).count()
        print(f"✅  Seeded {total} questions successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
