import os, datetime, sys, shutil, sys, json, re, cryptography, uuid, firebase_admin
from cryptography.fernet import Fernet 
from firebase_admin import credentials, firestore

# Initialise Firebase 
cred = credentials.Certificate(r"C:\Users\HP\OneDrive\Pictures\Documents\Desktop\AIRS\backend\src\serviceAccountKey.json")
db = firestore.client()

encryption_key = Fernet.generate_key() #randomly generate a key 
cipher = Fernet(encryption_key) # value of key assigned to var

# Directories for pc and laptop 
src_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//raw-logs" # directory where raw logs come from an ids

dst_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//clean-logs" # raw logs cleaned and sent to dst



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
    
    # 2. Authentication & Account Security (Brute Force / Credential Stuffing)
    AUTH_ATTACKS = [
        "failed password", "invalid user", "authentication failure", "unauthorized",
        "login failed", "access denied", "bad password", "locked out", "user not found"
    ]
    
    # 3. System & Malware Indicators (RCE / Post-Exploitation)
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

# adding batching for brute force to reduce lines being parsed to llm
BATCH_LIMIT = 5 # Number of suspicious lines to collect before calling LLM
suspicious_buffer = [] # Temporary list to hold lines

def is_suspicious(line):
    line_lower = line.lower()
    # If any suspicious word is in the line, the LLM will look at it
    return any(keyword in line_lower for keyword in SUSPICIOUS_KEYWORDS)

def is_noise(line):
    return any(pattern in line.lower() for pattern in KNOWN_SAFE_PATTERNS)

def process_batch(batch_list):
    print(f"\n--- [ACTION] BATCH OF {len(batch_list)} READY FOR LLM ---")
    combined_text = "\n".join([item['raw_sanitised_text'] for item in batch_list])
    # Future LLM call goes here
    print(f"Combined context preview: {combined_text[:50]}...")

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
                "timestamp": firestore.SERVER_TIMESTAMP, # timestamp created from firestore
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
                event_json = json.dumps(event, default=str).encode() # convert to json string and then to bytes
                encrypted_token = cipher.encrypt(event_json).decode() # decode back to string for storage

                # Firestore needs to recieve a dictionary { "key": "value" }
                encrypted_payload = {
                    "data": encrypted_token,
                    "is_encrypted": True,
                    "timestamp": firestore.SERVER_TIMESTAMP # used for sorting
                }
                # Push to Firestore
                doc_ref = db.collection("incidents").add(encrypted_payload) 
                
                # Add doc ID for later LLM updates
                event['doc_id'] = doc_ref[1].id 
                
                # Add to the buffer for batching
                suspicious_buffer.append(event)

                # Trigger batch if limit reached
                if len(suspicious_buffer) >= BATCH_LIMIT:
                    process_batch(suspicious_buffer)
                    suspicious_buffer = [] 
            
            # everything appended to processed_events so LOCAL JSON 
            # files remain a complete record of the whole log file
            processed_events.append(event)

        if len(suspicious_buffer) > 0: # process remaining suspicious items
            process_batch(suspicious_buffer)
            suspicious_buffer = []

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

    if not os.path.exists(src_dir) or not os.path.exists(dst_dir): # more efficient way to check the dirs exist using .exists instead
        sys.exit("Error: Directories missing.")
            

    print ("Checking for new logs...")

    # Get all files in the source folder
    all_files = os.listdir(src_dir)

    for file in all_files:
        name, ext = os.path.splitext(file) # .split text to split the file as a more efficient way
        if ext in acc_ext:
            src_path = os.path.join(src_dir, file)
            dst_json_path = os.path.join(dst_dir, name + ".json") # .join to put the ext on the new file

            # more efficient way to prevent duplicated using .exists instead
            if not os.path.exists(dst_json_path):
                log_sanitiser(src_path)
            else:
                print(f"Skipping {file}: Already processed.")  

if __name__ == "__main__":
    log_watcher()
