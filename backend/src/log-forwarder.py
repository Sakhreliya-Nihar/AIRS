import os, datetime, sys, json, re, uuid, firebase_admin, time
from firebase_admin import credentials, firestore
from dotenv import load_dotenv
from google import genai
from security.crypto import encrypt_payload # removed encryption within this file and added it to a new helper function 

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
acc_ext = [".log", ".txt"] # accepted file extensions
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
        "connection refused", "port scan"
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

def is_suspicious(line):
    line_lower = line.lower()
    # If any suspicious word is in the line, the LLM will look at it
    return any(keyword in line_lower for keyword in SUSPICIOUS_KEYWORDS)

def is_noise(line):
    line_lower = line.lower()
    return any(pattern in line_lower for pattern in KNOWN_SAFE_PATTERNS)

def process_batch(batch_list):
    global last_batch_time

    # takes plantext data, snesds to llm as a group to save credits, then updates firestore
    print(f"\n--- [ACTION] BATCH OF {len(batch_list)} READY FOR LLM ---")

    # Group the cleaned logs from memory
    combined_text = "\n".join([f"ID {item['event_id']}: {item['raw_sanitised_text']}" for item in batch_list])

    try: 

        print("Waiting 60 seconds for API rate limits...")
        time.sleep(61)

        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=f"""Analyze each of these logs individually for a small/medium business owner. Explain what happened in a clear, non-technical way and give a simple recommendation."

            LOGS:
            {combined_text}
            
            Return ONLY a JSON list of objects, one for each ID provided:
            [
              {{ 
                "event_id": "the_original_id",
                "summary": "Specific non-technical summary for this log", 
                "recommendation": "Specific recommendation for this log", 
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

        # Update Firestore individually for each item in the batch
        for item in batch_list:
            doc_id = item.get("doc_id")
            event_id = item.get("event_id")
            
            if event_id in results_map and doc_id:
                res = results_map[event_id]
                # Encrypt the INDIVIDUAL insight
                encrypted_insights = encrypt_payload({
                    "summary": res['summary'],
                    "recommendation": res['recommendation'],
                    "risk_score": res['risk_score']
                })
                db.collection("incidents").document(doc_id).update({
                    "ai_insights": [encrypted_insights], # Save as a list for your frontend
                    "risk_score": res['risk_score'], # Store plain for analytics
                    "analysis_status": "completed"
                })
        print("Success: Individual AI Analysis published to firestore")

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

def log_sanitiser(src_file):
    processed_events = [] # list to hold processed events
    global suspicious_buffer
    file_name_only = os.path.basename(src_file)
    
    try: 
        with open(src_file, "r") as f: #open and read the raw log file  
            lines = f.readlines()

        for line in lines: #extract each line of the log file individually
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
 
            # batching logic
            if event["is_suspicious"]:


                #encrypt files 
                encrypted_token = encrypt_payload(event) 

                # Firestore needs to recieve a dictionary { "key": "value" }
                encrypted_payload = {
                    "data": encrypted_token,
                    "is_encrypted": True,
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

        # save dictionary as JSON for llm parsing 
        output_filename = file_name_only.replace(".log", ".json")
        dst_path = os.path.join(dst_dir, output_filename)
        with open(dst_path, "w") as f:
            json.dump(processed_events, f, indent=4, default=str)
            
        print(f"Success: Sanitised {len(processed_events)} lines and uploaded to Firestore.")
        return processed_events 
        
    except Exception as e:
        print("Error processing file: " + str(e))

# checks the directory for log files
def log_watcher():
    global suspicious_buffer, last_batch_time, processed_files_announced

    if not os.path.exists(src_dir) or not os.path.exists(dst_dir): # more efficient way to check the dirs exist using .exists instead
        sys.exit("Error: Directories missing.")
            

    print ("Checking for new logs...")

while True: # The script now runs continuously
        # Get all files in the source folder
        all_files = os.listdir(src_dir)
        new_data_found = False

        for file in all_files:
            name, ext = os.path.splitext(file) # .split text to split the file as a more efficient way
            if ext in acc_ext:
                src_path = os.path.join(src_dir, file)
                dst_json_path = os.path.join(dst_dir, name + ".json") # .join to put the ext on the new file

                # more efficient way to prevent duplicated using .exists instead
                if not os.path.exists(dst_json_path):
                    log_sanitiser(src_path)
                    new_data_found = True
                    processed_files_announced.add(file) # log check to prevent spam
                else:
                    if file not in processed_files_announced:
                        print(f"Skipping {file}: Already processed.")
                        processed_files_announced.add(file)

        # Check for Timeout
        time_since_last_batch = time.time() - last_batch_time
        
        if len(suspicious_buffer) > 0 and time_since_last_batch >= MAX_WAIT_SECONDS: # moved buffer upload here to wait for more events to be added to buffer before upload
                print(f"--- [TIMEOUT] {time_since_last_batch:.0f}s elapsed. Processing partial batch of {len(suspicious_buffer)} ---")
                process_batch(suspicious_buffer)
                suspicious_buffer = []
        
        # Sleep to prevent CPU hammering
        if not new_data_found:
            time.sleep(10) # Wait 10 seconds before checking for new files again

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
