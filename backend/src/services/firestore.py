import firebase_admin, os, threading
from firebase_admin import credentials, firestore
from security.crypto import decrypt_payload

current_dir = os.path.dirname(__file__)
cred = credentials.Certificate(os.path.join(current_dir, "..", "serviceAccountKey.json"))

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

# CACHE 1: INCIDENTS 
GLOBAL_INCIDENTS_CACHE = []
incident_cache_lock = threading.Lock()

def on_incident_snapshot(col_snapshot, changes, read_time):
    global GLOBAL_INCIDENTS_CACHE
    print(f"\n[SYNC] Firebase pushed an INCIDENT update! Updating RAM cache...")
    updated_list = []


    for doc in col_snapshot:
        data = doc.to_dict()
        decrypted_event = decrypt_payload(data.get("data"))
        if decrypted_event is None: continue


        ai_insights = None
        raw_insights = data.get("ai_insights")
        
        if raw_insights:
            if isinstance(raw_insights, list) and len(raw_insights) > 0:
                ai_insights = [decrypt_payload(raw_insights[0])]
            elif isinstance(raw_insights, str):
                ai_insights = [decrypt_payload(raw_insights)]

        raw_notes = data.get("user_notes", [])
        decrypted_notes = [decrypt_payload(n) for n in raw_notes if n is not None]
        updated_list.append({
            "id": doc.id,
            "event": decrypted_event,
            "ai_insights": ai_insights,
            "analysis_status": data.get("analysis_status", "pending"),
            "timestamp": data.get("timestamp"),
            "user_notes": decrypted_notes,
            "completed_steps": data.get("completed_steps", []),
            "assigned_to": data.get("assigned_to", "")
        })
    with incident_cache_lock:
        GLOBAL_INCIDENTS_CACHE = updated_list
    print("[SYNC] Incident Cache updated successfully.")

# CACHE 2: USERS 
GLOBAL_USERS_CACHE = []
users_cache_lock = threading.Lock()

def on_users_snapshot(col_snapshot, changes, read_time):
    global GLOBAL_USERS_CACHE
    print(f"\n[SYNC] Firebase pushed a USERS update! Updating RAM cache...")
    updated_users = []
    
    for doc in col_snapshot:
        data = doc.to_dict()
        data["id"] = doc.id # React needs ID for the dropdown menu
        updated_users.append(data)
        
    with users_cache_lock:
        GLOBAL_USERS_CACHE = updated_users
    print("[SYNC] Users Cache updated successfully.")



# START THE BACKGROUND LISTENERS
print("Starting Firestore Real-Time Listeners (0-Read Mode Active)...")
# 1. Watch Incidents
incident_query = db.collection("incidents").order_by("timestamp", direction=firestore.Query.DESCENDING)
incident_watch = incident_query.on_snapshot(on_incident_snapshot)

# 2. Watch Users
users_query = db.collection("users")
users_watch = users_query.on_snapshot(on_users_snapshot)



# FASTAPI ROUTE HANDLERS 
def get_incidents():
    """Returns the decrypted incidents from local RAM."""
    with incident_cache_lock:
        return GLOBAL_INCIDENTS_CACHE

def get_users():
    """Returns the team members list from local RAM."""
    with users_cache_lock:
        return GLOBAL_USERS_CACHE