from fastapi import APIRouter
from services.firestore import get_incidents

router = APIRouter(prefix="/api/incidents", tags=["Incidents"]) # every route defined will start with this path. 


@router.get("") # trigger function when a GET is made
def fetch_incidents():
    return get_incidents() # imports the incidents from firestore.py 