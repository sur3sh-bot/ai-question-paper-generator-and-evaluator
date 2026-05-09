# AI Question Paper Generator & Evaluator

An AI-powered web application that generates question papers dynamically using FastAPI and React.  
The system allows users to create tests based on difficulty, question type, and subject/topic.

---

## Features

- AI-based question generation
- Dynamic test creation
- MCQ and fill-in-the-blank support
- Timer-based test interface
- Progress tracking
- Answer submission and evaluation
- Modern React frontend
- FastAPI backend API

---

## Tech Stack

### Frontend
- React
- Vite
- React Router
- TailwindCSS
- Axios

### Backend
- FastAPI
- Python
- Uvicorn
- OpenAI API (optional AI integration)

---

## Project Structure

text project/ │ ├── frontend/ │   ├── src/ │   └── package.json │ ├── backend/ │   ├── app/ │   │   ├── main.py │   │   └── routes/ │   │       └── tests.py │   └── requirements.txt │ └── README.md 

---

# Frontend Setup

## Install dependencies

bash cd frontend npm install 

## Run frontend

bash npm run dev 

Frontend runs on:

text http://localhost:5173 

---

# Backend Setup

## Create virtual environment

bash cd backend python3 -m venv venv 

## Activate virtual environment

### macOS/Linux

bash source venv/bin/activate 

### Windows

bash venv\Scripts\activate 

---

## Install dependencies

bash pip install -r requirements.txt 

---

## Run backend server

bash uvicorn app.main:app --reload 

Backend runs on:

text http://127.0.0.1:8000 

---

# API Endpoints

## Generate Test

http POST /generate-test 

### Example Request

json {   "num_questions": 10,   "difficulty": "medium",   "question_types": ["mcq"],   "topic": "Operating Systems" } 

---

# Future Improvements

- Real AI-generated questions using Minimax
- PDF upload support
- Automatic evaluation and scoring
- Database integration
- Authentication system
- Result analytics dashboard

---

# AI Integration

The backend is designed to support AI model integration using:
- OpenAI API
- Gemini API
- Ollama / Local LLMs

Currently, placeholder questions are generated for testing purposes.

---

# Authors

Developed as a group project for academic purposes.