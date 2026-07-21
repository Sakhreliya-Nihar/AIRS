from fastapi import APIRouter, HTTPException # Add HTTPException
from services.firestore import get_incidents, db # Import db from your firestore service
from pydantic import BaseModel
import firebase_admin.firestore as firestore # Needed for firestore.ArrayUnion

router = APIRouter(prefix="/api/incidents", tags=["Incidents"]) # every route defined will start with this path. 


@router.get("") # trigger function when a GET is made
def fetch_incidents():
    return get_incidents() # imports the incidents from firestore.py 

class NoteRequest(BaseModel):
    note: str

@router.patch("/{doc_id}/resolve")
def resolve_incident(doc_id: str):
    try:
        db.collection("incidents").document(doc_id).update({
            "analysis_status": "resolved"
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{doc_id}/notes")
def add_note(doc_id: str, request: NoteRequest):
    try:
        # Use ArrayUnion so we don't overwrite previous notes
        db.collection("incidents").document(doc_id).update({
            "user_notes": firestore.ArrayUnion([request.note])
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))