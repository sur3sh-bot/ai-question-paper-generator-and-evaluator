"""
AI-Powered Question Paper Generator & Evaluator — FastAPI Application Entry Point.
"""

from dotenv import load_dotenv
load_dotenv()  # Load .env before any other imports that use os.getenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app import models
# Added 'upload' to the imported routes
from app.routes import questions, test, evaluation, results, upload

# Create all database tables (SQLite creates the file if it doesn't exist)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Question Paper Generator & Evaluator",
    description=(
        "A production-ready REST API for managing a question bank, "
        "generating randomized question papers, and evaluating answers instantly."
    ),
    version="1.0.0",
)

# CORS — allow all origins for development (React runs on 5173, FastAPI on 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(questions.router)
app.include_router(test.router)
app.include_router(evaluation.router)
app.include_router(results.router)
# CRITICAL: Register the upload router to enable AI document processing
app.include_router(upload.router)


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "message": "Question Paper Generator & Evaluator API is running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    """Detailed health check."""
    return {"status": "healthy", "version": "1.0.0"}