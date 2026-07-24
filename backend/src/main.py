from fastapi import FastAPI, Request, Depends# core api framework
from fastapi.middleware.cors import CORSMiddleware # security tool for controlling the sites that can talk to the backend
from api.incidents import router as incidents_router # import logiv from incidents.py
from services.firestore import db # Import db to write audit logs
import time
from security.auth import get_api_key # Import the auth check
import firebase_admin.firestore as firestore

app = FastAPI(title="SOC Backend API")

ORIGINS = [
    "http://localhost:5173", # Local development
    
]

app.add_middleware(
CORSMiddleware,
    allow_origins=ORIGINS, 
allow_credentials=True,
allow_methods=["*"], # all types of http requests
allow_headers=["*"],
)

# AUDIT TRAIL MIDDLEWARE 
@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    start_time = time.time()
    
    # Process the request
    response = await call_next(request)
    
    process_time = time.time() - start_time

    # Log details to Firestore "audit_logs" collection

    try:
        log_data = {
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host,
            "timestamp": firestore.firestore.SERVER_TIMESTAMP,
            "status_code": response.status_code,
            "process_time": process_time,
            "user_agent": request.headers.get("user-agent")
        }
        # Write to Firestore asynchronously
        db.collection("audit_logs").add(log_data)
    except Exception as e:
        print(f"Failed to write audit log: {e}")

    return response

app.include_router(incidents_router, dependencies=[Depends(get_api_key)]) # instead of writing all endpoints, it uses fastapi to check incidents.py for the routes


@app.get("/")
def root():
    return {"status": "API running"} # confirmation message