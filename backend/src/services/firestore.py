import firebase_admin, os
from firebase_admin import credentials, firestore
from security.crypto import decrypt_payload

current_dir = os.path.dirname(__file__)
cred = credentials.Certificate(os.path.join(current_dir, "..", "serviceAccountKey.json"))

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client() # connecting to firestore 


def get_incidents(): 
    incidents = []

    docs = db.collection("incidents").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(100).stream()

    for doc in docs:
        data = doc.to_dict()
        # 1. Decrypt the main log data (this is usually a string)
        decrypted_event = decrypt_payload(data["data"])
        
        if decrypted_event is None:
            continue

        # 2. Handle ai_insights (stored as a list)

        ai_insights = None
        raw_insights = data.get("ai_insights")
        
        if raw_insights:
            # Check if it's a list and has at least one item
            if isinstance(raw_insights, list) and len(raw_insights) > 0:
                # Decrypt the FIRST string in the list
                ai_insights = [decrypt_payload(raw_insights[0])]
            elif isinstance(raw_insights, str):
                # Fallback for old data stored as a single string
                ai_insights = [decrypt_payload(raw_insights)]

        incidents.append({
            "id": doc.id,
            "event": decrypted_event,
            "ai_insights": ai_insights,
            "analysis_status": data.get("analysis_status", "pending"),
            "timestamp": data.get("timestamp"),
            "user_notes": data.get("user_notes", []) # Ensure notes don't break if missing
        })

    return incidents