import os, datetime, sys, shutil, sys, json, re, cryptography, uuid, firebase_admin
from cryptography.fernet import Fernet 
from firebase_admin import credentials, firestore

# Initialise Firebase 
cred = credentials.Certificate(r"C:\Users\HP\OneDrive\Pictures\Documents\Desktop\AIRS\backend\src\serviceAccountKey.json")
db = firestore.client()

# key = Fernet.generate_key() #randomly generate a key
# fernet = Fernet.generate_key

# Directories for pc and laptop 
src_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//raw-logs" # directory where raw logs come from an ids

dst_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//clean-logs" # raw logs cleaned and sent to dst



# Config for sanitisation 
acc_ext = [".log", ".txt"] # accepted file extensions
pattern_ip = r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
pattern_mac = r"(?:[0-9A-Fa-f]{2}[:-]){5}(?:[0-9A-Fa-f]{2})"
#pattern_email = ("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

def log_sanitiser(src_file):
    processed_events = [] # list to hold processed events
    file_name_only = os.path.basename(src_file)
    
    try: 
        with open(src_file, "r") as f: #open and read the raw log file  
            lines = f.readlines()

            for line in lines: #extract each line of the log file individually
                if not line.strip(): continue # skips any lines that are empty


                # remove mac address entirely for same reason as ip
                macs = re.findall(pattern_mac, line) # find and store before redacting the text, same as ips
                sanitised_line = line
                sanitised_line = re.sub(pattern_mac, "[MAC_REDACTED]", sanitised_line) # repalce all mac oocurances with redacted text

                ips = re.findall(pattern_ip, line)#regex to find ips first
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
                    "raw_sanitized_text": sanitised_line.strip(),
                    "technical_details": {
                        "original_internal_ips": internal_ips, # seperate list for easier detection for SOC / SME
                        "original_external_ips": external_ips,
                        "original_macs" : macs, # now stores the orginal mac addressess
                        "ip_count": len(unique_ips) # number of ips
                    },
                    "original_filename": file_name_only, # find the original file that it came from for future reference
                    "analysis_status": "pending" # ready for LLm later onwards
                }

                db.collection("incidents").add(event) # pushes each line into incidents collection in firestore
                processed_events.append(event)

            # save dictionary as JSON for llm parsing 
            output_filename = file_name_only.replace(".log", ".json")
            dst_path = f"{dst_dir}//{output_filename}"


            with open(dst_path, "w") as f:
                json.dump(processed_events, f, indent=4, default=str)
            
            print(f"Success: Sanitised {len(processed_events)} lines and uploaded to Firestore.")
            return dst_path 
        
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
