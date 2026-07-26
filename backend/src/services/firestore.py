import firebase_admin, os, hashlib
from firebase_admin import credentials, firestore
from security.crypto import decrypt_payload

current_dir = os.path.dirname(__file__)
cred = credentials.Certificate(os.path.join(current_dir, "..", "serviceAccountKey.json"))

if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client() # connecting to firestore 

def verify_integrity(stored_hash, event_id, text, timestamp):
    """Recalculates the hash and compares it to the stored one."""
    if not stored_hash:
        return False
    
    # Recreate the exact same string format used in the upload script
    combined_string = f"{event_id}|{text}|{timestamp}"
    new_hash = hashlib.sha256(combined_string.encode()).hexdigest()
    
    return new_hash == stored_hash

def get_incidents(): 
    incidents = []

    docs = db.collection("incidents").order_by("timestamp", direction=firestore.Query.DESCENDING).limit(100).stream()


    for doc in docs:
        data = doc.to_dict()
        stored_hash = data.get("integrity_hash")

        # Decrypt the main log data (usually a string)
        decrypted_event = decrypt_payload(data["data"])
        
        if decrypted_event is None:
            continue


        # integritycheck    
        is_verified = verify_integrity(
            stored_hash,
            decrypted_event.get("event_id"),
            decrypted_event.get("raw_sanitised_text"),
            decrypted_event.get("local_timestamp")
        )

        # Handle ai_insights (stored as a list)
        ai_insights = None
        raw_insights = data.get("ai_insights")
        
        if raw_insights:
            # Check if it's a list and has at least one item
            if isinstance(raw_insights, list) and len(raw_insights) > 0:
                # Decrypt the first string list
                ai_insights = [decrypt_payload(raw_insights[0])]
            elif isinstance(raw_insights, str):
                # Fallback for old data stored as a single string
                ai_insights = [decrypt_payload(raw_insights)]

        raw_notes = data.get("user_notes", [])
        # We use a check to ensure we don't try to decrypt None
        decrypted_notes = [
            decrypt_payload(n) for n in raw_notes if n is not None
            ]        

        incidents.append({
            "id": doc.id,
            "event": decrypted_event,
            "ai_insights": ai_insights,
            "analysis_status": data.get("analysis_status", "pending"),
            "timestamp": data.get("timestamp"),
            "user_notes": decrypted_notes,
            "is_verified": is_verified 
        })

    return incidents