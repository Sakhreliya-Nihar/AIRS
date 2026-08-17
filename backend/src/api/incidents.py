from fastapi import APIRouter, HTTPException, Body
from services.firestore import get_incidents, db
from pydantic import BaseModel
import firebase_admin.firestore as firestore 
from security.crypto import encrypt_payload

router = APIRouter(tags=["API Routes"]) # Initialize the router and group these endpoints under "API Routes"

class NoteRequest(BaseModel):
    """Defines the expected JSON payload for adding a note to an incident."""
    note: str

class AssignRequest(BaseModel):
    """Defines the expected JSON payload for assigning an incident to a user."""
    assigned_to: str

@router.get("/api/incidents") 
# API Endpoints

@router.get("/api/incidents") # retreieves all incidients
def fetch_incidents():
    return get_incidents() 

@router.patch("/api/incidents/{doc_id}/resolve") # Updates the status of a specific incident to "resolved".
def resolve_incident(doc_id: str):
    try:
        db.collection("incidents").document(doc_id).update({
            "analysis_status": "resolved"
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/incidents/{doc_id}/notes") # Appends a note to a specific incident
def add_note(doc_id: str, request: NoteRequest):
    try:


        encrypted_note = encrypt_payload(request.note)


        db.collection("incidents").document(doc_id).update({
            "user_notes": firestore.ArrayUnion([encrypted_note])
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/incidents/{doc_id}/mitigate")  # Appends a checked box to the incident
async def update_mitigation_progress(doc_id: str, completed_steps: list[int] = Body(..., embed=True)):
    """Saves the list of checked boxes (by index) to Firestore"""
    try:
        doc_ref = db.collection("incidents").document(doc_id)

        doc_ref.update({"completed_steps": completed_steps})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/api/incidents/{doc_id}/assign")  # Appends a user to an incident
def assign_incident(doc_id: str, request: AssignRequest):
    """Saves the assigned user to Firestore"""
    try:
        db.collection("incidents").document(doc_id).update({
            "assigned_to": request.assigned_to
        })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/users") # Retrieves all users
def fetch_users():
    """Fetches all users for the frontend dropdown"""
    try:
        users_ref = db.collection("users").stream()
        users_list = []
        for doc in users_ref:
            user_data = doc.to_dict()
            user_data["id"] = doc.id 
            users_list.append(user_data)
        
        return users_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))