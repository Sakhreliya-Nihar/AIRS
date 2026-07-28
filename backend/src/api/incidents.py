from fastapi import APIRouter, HTTPException, Body # Add HTTPException
from services.firestore import get_incidents, db # Import db from your firestore service
from pydantic import BaseModel
import firebase_admin.firestore as firestore # Needed for firestore.ArrayUnion

from security.crypto import encrypt_payload
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

        # Encrypt the plain text note first
        encrypted_note = encrypt_payload(request.note)

        # Use ArrayUnion so we don't overwrite previous notes
        db.collection("incidents").document(doc_id).update({
            "user_notes": firestore.ArrayUnion([encrypted_note])
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/incidents/{doc_id}/mitigate")
async def update_mitigation_progress(doc_id: str, completed_steps: list[int] = Body(..., embed=True)):
    """Saves the list of checked boxes (by index) to Firestore"""
    try:
        doc_ref = db.collection("incidents").document(doc_id)
        # saves an array of integers representing the indexes of checked items (e.g., [0, 2])
        doc_ref.update({"completed_steps": completed_steps})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
