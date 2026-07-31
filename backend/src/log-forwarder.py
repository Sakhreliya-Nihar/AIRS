import os, datetime, sys, json, re, uuid, firebase_admin, time, hashlib
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from google import genai
from security.crypto import encrypt_payload
from google.genai.types import GenerateContentConfig, SafetySetting, HarmCategory, HarmBlockThreshold
from services.notifications import send_consolidated_email

current_dir = os.path.dirname(__file__)#trying to fix pathing issues between laptop and pc
ENV_PATH = os.path.join(current_dir, ".env")
load_dotenv(ENV_PATH)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Create a single client object
client = genai.Client(api_key=GEMINI_API_KEY)

# Initialise Firebase 
cred = credentials.Certificate(os.path.join(current_dir, "serviceAccountKey.json"))
firebase_admin.initialize_app(cred)
db = firestore.client()



local_time = datetime.datetime.now().isoformat() # timestamp for clean logs

# Directories for raw and clean logs
src_dir = os.path.join(current_dir, "..", "raw-logs")
dst_dir = os.path.join(current_dir, "..", "clean-logs") 



# Config for sanitisation 
acc_ext = [".log", ".txt", ".ids", ".fast"] # accepted file extensions
pattern_ip = r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
pattern_mac = r"(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})"
#pattern_email = ("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

# Define keywords for suspicious prediction
class ThreatDictionary:
    # 1. Web Application Attacks (SQLi, XSS, Path Traversal)
    WEB_ATTACKS = [
        "<script>", "alert(", "onerror=", "onload=", "eval(", "src=",  # XSS
        "union select", "select *", "drop table", "insert into", "order by", "--", " ' or '1'='1", # SQLi
        "../", "..\\", "etc/passwd", "windows/system32", "boot.ini", ".env", ".git" # Path Traversal / Info Leak
    ]
    
    # 2. Authentication & Account Security (Brute Force)
    AUTH_ATTACKS = [
        "failed password", "invalid user", "authentication failure", "unauthorized",
        "login failed", "access denied", "bad password", "locked out", "user not found"
    ]
    
    # 3. System & Malware Indicators (Post-Exploitation)
    SYSTEM_ATTACKS = [
        "rm -rf", "sudo", "chmod", "chown", "wget ", "curl ", "netcat", "nc -e", # Command Injection
        "compromised", "unexpected service", "malicious", "backdoor", "shell",
        "powershell", "base64", "python -c", "perl -e" # Common script execution
    ]

    # 4. Network Scanning & Reconnaissance (Probing)
    RECON = [
        "nmap", "masscan", "dirbuster", "nikto", "sqlmap", "iptables-dropped", 
        "connection refused", "port scan", "icmp", "test packet"
    ]

    @classmethod
    def get_all(cls):
        # combine everything into one massive list for initial filter
        return cls.WEB_ATTACKS + cls.AUTH_ATTACKS + cls.SYSTEM_ATTACKS + cls.RECON

SUSPICIOUS_KEYWORDS = ThreatDictionary.get_all()

# list of patterns that are noisy but safe
# Expanded to include more background noise common in Linux/Web servers
KNOWN_SAFE_PATTERNS = [
    "session opened", "session closed", "systemd: started", "ntpdate", 
    "authorized_keys", "cron[", "postfix/", "dovecot:", "crond[", 
    "reached target", "pms-refresh", "status=sent (250 2.0.0 ok", 
    "starting update inventory", "connection closed by authenticating user"
]

# adding batching for brute force to reduce lines being parsed to llm at once
BATCH_LIMIT = 20 # Number of suspicious lines to collect before calling LLM
MAX_WAIT_SECONDS = 300 # 5 minutes 
last_batch_time = time.time() # Initialise the timer
suspicious_buffer = [] # Temporary list to hold lines
processed_files_announced = set() # stop the terminal spam for processed logs check



# --- HELPERS FOR FILE TRACKING ---
TRACKING_FILE = os.path.join(current_dir, "log_progress.json")
def get_file_progress():
    """Loads the last known read position for files."""
    if os.path.exists(TRACKING_FILE):
        try:
            with open(TRACKING_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}
def save_file_progress(progress_data):
    """Saves the current read position."""
    with open(TRACKING_FILE, 'w') as f:
        json.dump(progress_data, f)
def generate_integrity_hash(event_id, text, timestamp):
    """Creates a SHA-256 hash of the core event data to ensure integrity."""
    # combine the unique ID, the log text, and the timestamp string
    combined_string = f"{event_id}|{text}|{timestamp}"
    return hashlib.sha256(combined_string.encode()).hexdigest()

def is_suspicious(line):
    line_lower = line.lower()
    # If any suspicious word is in the line, the LLM will look at it
    return any(keyword in line_lower for keyword in SUSPICIOUS_KEYWORDS)

def is_noise(line):
    line_lower = line.lower()
    return any(pattern in line_lower for pattern in KNOWN_SAFE_PATTERNS)

def get_ai_persona():
    """Fetches the technical level setting from Firestore and returns a specific system prompt."""
    try:
        # Fetch the config document in the React Settings page
        doc = db.collection("settings").document("global_config").get()
        if doc.exists:
            level = doc.to_dict().get("tech_level", "business_owner")
        else:
            level = "business_owner"
    except Exception as e:
        print(f"Warning: Could not fetch settings ({e}). Defaulting to Business Owner.")
        level = "business_owner"

    # Define the 3 distinct personalities
    prompts = {
        "business_owner": (
            "Analyze these logs for a non-technical business owner. "
            "Avoid jargon. Focus on: Is this dangerous? Do I need to panic? "
            "For the recommendation, tell them simply who to contact or if they can ignore it."
        ),
        "it_support": (
            "Analyze these logs for a Junior IT Sysadmin. "
            "Use standard IT terminology. Focus on: What service is failing? Is it a user error or a bug? "
            "For the recommendation, suggest specific actions like 'Reset User Password', 'Check Firewall', or 'Restart Service'."
        ),
        "soc_analyst": (
            "Analyze these logs for a Senior Security Analyst (SOC). "
            "Be extremely technical. Focus on: Attack vectors, specific payload analysis (SQLi/XSS patterns), and Indicators of Compromise (IOCs). "
            "For the recommendation, provide specific remediation commands (e.g., 'Block IP x via iptables', 'Patch CVE-2023-xxx')."
        )
    }
    return prompts.get(level, prompts["business_owner"])

def process_batch(batch_list):
    global last_batch_time

    # takes plantext data, snesds to llm as a group to save credits, then updates firestore
    print(f"\n--- [ACTION] BATCH OF {len(batch_list)} READY FOR LLM ---")

    # Group the cleaned logs from memory
    combined_text = "\n".join([f"ID {item['event_id']}: {item['raw_sanitised_text']}" for item in batch_list])

    persona_instruction = get_ai_persona() 
    print(f"AI Persona Loaded: {persona_instruction[:50]}...") # Print first 50 chars to confirm
    try: 
        print("Waiting 60 seconds for API rate limits...")
        time.sleep(61)
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
             config=GenerateContentConfig(
                safety_settings=[
                    SafetySetting(
                        category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold=HarmBlockThreshold.BLOCK_NONE,
                    ),
                    SafetySetting(
                        category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold=HarmBlockThreshold.BLOCK_NONE,
                    ),
                    SafetySetting(
                        category=HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold=HarmBlockThreshold.BLOCK_NONE,
                    ),
                    SafetySetting(
                        category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold=HarmBlockThreshold.BLOCK_NONE,
                    ),
                ],
                response_mime_type="application/json"
            ),
            contents=f"""


            {persona_instruction}

            LOGS:
            {combined_text}
            
            INSTRUCTIONS FOR MITIGATION:
            You are an IT Administrator. 
            For 'mitigation_steps', do NOT give generic advice like "Contact IT". 
            Instead, provide specific CLI commands or exact actions based on the log content.

            Examples:
            - If an IP is attacking: "Run: sudo iptables -A INPUT -s [The_IP_Address] -j DROP"
            - If a user is compromised: "Run: sudo passwd -l [The_Username]"
            - If a service is failing: "Run: sudo systemctl restart [Service_Name]"

            Return ONLY a JSON list of objects:
            [
              {{ 
                "event_id": "the_original_id",
                "summary": "Short explanation of what happened", 
                "mitigation_steps": [
                    "Step 1 (Valuable Info, like Who to contact)",
                    "Step 2 (Specific Command)",
                    "Step 3 (Configuration Change)",
                    "Step 4 (Verification Step)"
                ],
                "risk_score": 1-10 
              }}
            ] 
            """
        )

        # print (response)    
        raw_text = response.text.replace("```json", "").replace("```", "").strip()
        ai_results = json.loads(raw_text)

        # Map results by event_id for easy lookup
        results_map = {res['event_id']: res for res in ai_results}


        # Fetch users once per batch to save resources
        users = list(db.collection("users").stream())

        user_notification_batches = {}




        # Update Firestore individually for each item in the batch
        for item in batch_list:
            doc_id = item.get("doc_id")
            event_id = item.get("event_id")
            
            if event_id in results_map and doc_id:
                res = results_map[event_id]
                risk = res['risk_score']
                summary = res['summary']
                # Encrypt the INDIVIDUAL insight
                encrypted_insights = encrypt_payload({
                    "summary": summary,
                    "mitigation_steps": res.get('mitigation_steps', ["Review logs manually"]), # Fallback if empty
                    "risk_score": risk
                })
                db.collection("incidents").document(doc_id).update({
                    "ai_insights": [encrypted_insights], # Save as a list for frontend
                    "risk_score": risk, # Store plain for analytics
                    "analysis_status": "AI_Analysis_Complete"
                })
        
               # Trigger Notifications for this specific incident
                for user_doc in users:
                    user_data = user_doc.to_dict()
                    target_email = user_data.get("email")
                    pref = user_data.get("notification_level", "critical")
                    
                    # Logic to decide if email is seent
                    should_notify = (
                        (pref == "all") or 
                        (pref == "high" and risk >= 6) or 
                        (pref == "critical" and risk >= 8)
                    )

                    if should_notify and target_email:
                        if target_email not in user_notification_batches:
                            user_notification_batches[target_email] = []
                        
                        # Add this incident to the user's specific batch
                        user_notification_batches[target_email].append({
                            "event_id": event_id,
                            "risk_score": risk,
                            "summary": summary
                        })
                        
        # After processing ALL incidents in the batch, send ONE email per user
        for email, incident_list in user_notification_batches.items():
            send_consolidated_email(email, incident_list)

        print("Success: Batch processed and notifications sent.")

    except Exception as e:
        # If rate limit hit...
        if "429" in str(e):
            print("RATE LIMIT HIT: The script is moving too fast for the Gemini Free Tier.")
            print("Action: Increase BATCH_LIMIT or wait 60 seconds before running again.")
        elif "404" in str(e):
            print("MODEL NOT FOUND.")
        else:
            print(f"LLM Error: {e}")
    # Timer Reset whenever a batch is processed
    last_batch_time = time.time()
    print("Batch processed and timer reset.")        

def log_sanitiser(new_lines, file_name_only):
    processed_events = [] # list to hold processed events
    global suspicious_buffer
    print(f"Processing {len(new_lines)} new lines from {file_name_only}...")

    # REMOVED file opening logic since we now pass 'new_lines' directly
    # with open(src_file, "r") as f: #open and read the raw log file
    #     lines = f.readlines()

    for line in new_lines: #extract each line of the log file individually
        if not line.strip(): continue # skips any lines that are empty
        if "CRON" in line and "CMD" in line: continue # Bins the pointless background traffic to save llm credits
        if is_noise(line): continue # Ignore 

        suspicious_flag = is_suspicious(line)
        analysis_status = "pending" if suspicious_flag else "ignored_low_risk"

        #sanitisation
        # remove mac address entirely for same reason as ip
        macs = re.findall(pattern_mac, line) # find and store before redacting the text, same as ips
        sanitised_line = re.sub(pattern_mac, "[MAC_REDACTED]", line) # repalce all mac oocurances with redacted text

        ips = re.findall(pattern_ip, sanitised_line)#regex to find ips first
        # Use a set to get unique IPs, then sort them to ensure consistentcy 
        unique_ips = sorted(list(set(ips)))
        # Separate into two lists
        internal_ips = [ip for ip in unique_ips if ip.startswith(("192.168.", "10."))]
        external_ips = [ip for ip in unique_ips if ip not in internal_ips]

        # External IPs now starting from 0
        for i, ip in enumerate(external_ips):
            sanitised_line = sanitised_line.replace(ip, f"[EXTERNAL_IP_{i}]")
        # Internal IPs now starting from 0 (seperate to external ips)
        for i, ip in enumerate(internal_ips):
            sanitised_line = sanitised_line.replace(ip, f"[INTERNAL_IP_{i}]")

        #create dictionary for log entry 
        event = {
            "event_id": str(uuid.uuid4())[:8], # generate unique id for every log entry
            "local_timestamp": local_time, # timestamp created from local clock
            "firestore_timestamp" : firestore.SERVER_TIMESTAMP,
            "raw_sanitised_text": sanitised_line.strip(),
            "technical_details": {
                "original_internal_ips": internal_ips, # seperate list for easier detection for SOC / SME
                "original_external_ips": external_ips,
                "original_macs" : macs, # now stores the orginal mac addressess
                "ip_count": len(unique_ips) # number of ips
            },
            "original_filename": file_name_only, # find the original file that it came from for future reference
            "analysis_status": analysis_status, # filtered ready for LLm later
            "is_suspicious": suspicious_flag # flags any suspicious threats that may be worth parsing to llm
        }

        integrity_hash = generate_integrity_hash(
            event["event_id"], 
            event["raw_sanitised_text"], 
            event["local_timestamp"]
        )
     # Add the hash to the event object so it's saved locally too
        event["integrity_hash"] = integrity_hash

        # batching logic
        if event["is_suspicious"]:

            #encrypt files 
            encrypted_token = encrypt_payload(event) 

            # Firestore needs to recieve a dictionary { "key": "value" }
            encrypted_payload = {
                "data": encrypted_token,
                "is_encrypted": True,
                "integrity_hash": integrity_hash,
                "timestamp": firestore.SERVER_TIMESTAMP # used for sorting
            }

            # Push to Firestore
            doc_ref = db.collection("incidents").add(encrypted_payload) 
            # Add doc ID for later LLM updates
            actual_doc_id = doc_ref[1].id
            event['doc_id'] = actual_doc_id # The Firestore UUID (e.g., "zX9yP...")
            
            # Add to the buffer for batching
            suspicious_buffer.append(event)
        
 # Trigger batch if limit reached
            if len(suspicious_buffer) >= BATCH_LIMIT:
                process_batch(suspicious_buffer) # send to LLM 
                suspicious_buffer = [] # clear the buffer back to empty
        
        # everything (inlucding unsuspicious data) appended to processed_events so LOCAL JSON 
        # files remain a complete record of the whole log file
        processed_events.append(event)

    # Note: We now APPEND to the JSON file if it exists, rather than overwriting
    # This keeps the local JSON record complete
    output_filename = file_name_only.replace(".log", ".json").replace(".ids", ".json")
    dst_path = os.path.join(dst_dir, output_filename)
    
    existing_data = []
    if os.path.exists(dst_path):
        try:
            with open(dst_path, "r") as f:
                existing_data = json.load(f)
        except:
            pass
    
    existing_data.extend(processed_events)
    
    with open(dst_path, "w") as f:
        json.dump(existing_data, f, indent=4, default=str)

    print(f"Success: Sanitised {len(processed_events)} lines from {file_name_only}.")
    return processed_events

# checks the directory for log files
def log_watcher():
    global suspicious_buffer, last_batch_time

    # Load where file reading was left off last time
    file_progress = get_file_progress()
    if not os.path.exists(src_dir) or not os.path.exists(dst_dir): # more efficient way to check the dirs exist using .exists instead
        sys.exit("Error: Directories missing.")
            

    print(f"Monitoring {src_dir} for changes...")

while True: # The script now runs continuously
        # Get all files in the source folder
        all_files = os.listdir(src_dir)
        new_data_found = False

        for file in all_files:
            name, ext = os.path.splitext(file) # .split text to split the file as a more efficient way
            
        if ext not in acc_ext and not file.endswith(".ids"): 
                continue

            src_path = os.path.join(src_dir, file)
            
            # --- RESTORED LOGIC: Check if we processed this file in the past ---
            # If we have NO progress record for this file, check if we made a JSON for it already.
            # If we did, we assume it was "fully read" in the old system.
            if file not in file_progress:
                # Construct the path where the JSON would be
                output_filename = file.replace(".log", ".json").replace(".ids", ".json")
                if not output_filename.endswith(".json"): output_filename += ".json"
                dst_json_path = os.path.join(dst_dir, output_filename)

                if os.path.exists(dst_json_path):
                    # We have seen this file before the update!
                    # Bookmark it at the CURRENT size so we skip everything inside it
                    # and only wait for NEW lines.
                    try:
                        current_size = os.path.getsize(src_path)
                        file_progress[file] = current_size
                        save_file_progress(file_progress)
                        print(f"Skipping previously processed file: {file} (Bookmarked at {current_size})")
                        continue
                    except OSError:
                        pass
            # -------------------------------------------------------------------

            # Get current file size
            try:
                current_size = os.path.getsize(src_path)
            except OSError:
                continue # File might be locked or deleted

            # Get the last known position (default to 0 if new file)
            last_pos = file_progress.get(file, 0)

            # If the file is smaller than before, it was likely truncated/rotated. Reset to 0.
            if current_size < last_pos:
                last_pos = 0

            # If there is NEW data (current size > last position)
            if current_size > last_pos:
                try:
                    with open(src_path, "r", encoding="utf-8", errors="replace") as f:
                        f.seek(last_pos) # JUMP to where we left off
                        new_lines = f.readlines()
                        
                        if new_lines:
                            log_sanitiser(new_lines, file) # Process ONLY the new lines
                            new_data_found = True
                        
                        # Update "bookmark"
                        file_progress[file] = f.tell() 
                        save_file_progress(file_progress)

                except Exception as e:
                    print(f"Error reading {file}: {e}")

        # Batch Timeout Logic
        time_since_last_batch = time.time() - last_batch_time
        
        if len(suspicious_buffer) > 0 and time_since_last_batch >= MAX_WAIT_SECONDS:
            print(f"--- [TIMEOUT] Processing partial batch of {len(suspicious_buffer)} ---")
            process_batch(suspicious_buffer)
            suspicious_buffer = []

        if not new_data_found:
            time.sleep(2) # Poll every 2 seconds

if __name__ == "__main__":
    try:
        log_watcher()
    except KeyboardInterrupt:
        print("\nScript stopped manually.")
        # Final flush before the script actually stops
        if len(suspicious_buffer) > 0:
            print(f"--- [FINAL FLUSH] Processing {len(suspicious_buffer)} remaining logs before exit ---")
            process_batch(suspicious_buffer)
        print("Shutdown complete. Goodbye!")
        sys.exit(0)
