from fastapi import APIRouter, UploadFile, File, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.database import get_db
from app.services.upload_service import process_upload

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/material")
async def upload_material(
    file: UploadFile = File(...),
    mcq_count: int = Query(3, alias="mcq_per_chunk", ge=1, le=10),
    fill_count: int = Query(2, alias="fill_per_chunk", ge=0, le=10),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Endpoint to upload study material (PDF, DOCX, PPTX, TXT).
    
    The file is processed through:
    1. Extraction & Cleaning
    2. Context-aware Chunking
    3. AI Question Generation (MCQs & Fill-in-the-blanks)
    4. Database Persistence
    """
    try:
        # This calls the orchestrator you just finished
        result = process_upload(
            upload=file,
            db=db,
            mcq_per_chunk=mcq_count,
            fill_per_chunk=fill_count
        )
        return result
        
    except HTTPException as he:
        # Re-raise known HTTP errors (like file too large or unsupported type)
        raise he
    except Exception as e:
        # Catch-all for unexpected pipeline failures
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")