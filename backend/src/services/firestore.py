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

    docs = (
        db.collection("incidents") # get the incidents collection...
        .order_by("timestamp", direction=firestore.Query.DESCENDING) # with most recent events at the top...
        .limit(100) # prevents thousands of logs being downloaded at once
        .stream() # reads one by one
    )

    for doc in docs:
        data = doc.to_dict()
        decrypted_event = decrypt_payload(data["data"]) # decrypt each incident using crypto.py...

        ai_insights = None
        if "ai_insights" in data:
            ai_insights = decrypt_payload(data["ai_insights"]) # and each ai insight as well

        incidents.append({ # add back to json format 
            "id": doc.id,
            "event": decrypted_event,
            "ai_insights": ai_insights,
            "analysis_status": data.get("analysis_status", "pending"),
            "timestamp": data.get("timestamp")
        })

    return incidents # returns the json incident to incidents.py