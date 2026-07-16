import os, datetime, sys, shutil, sys, json, re, cryptography, uuid, firebase_admin
from cryptography.fernet import Fernet 
from firebase_admin import credentials, firestore

# Initialise Firebase 
cred = credentials.Certificate("C:\Users\HP\OneDrive\Pictures\Documents\Desktop\AIRS\backend\src\serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# key = Fernet.generate_key() #randomly generate a key
# fernet = Fernet.generate_key

src_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//raw-logs" # directory where raw logs come from an ids

dst_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//clean-logs" # raw logs cleaned and sent to dst

acc_ext = [".log", ".txt"] # accepted file extensions
pattern_ip = r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
pattern_mac = r"([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})"
#pattern_email = ("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

def split_file(file): #splits the file to get the extension
    split_file = os.path.splitext(file)


    # print("Filename = " + file_name); ..
    # print("Extension = " + file_ext ); ..

    # return both values
    return split_file[0], split_file[1]



def log_sanitiser(src_file):
    processed_events = [] # list to hold processed events
    try: 
        with open(src_file, "r") as f: #open and read the raw log file
            raw_text = f.read()
            lines = f.readlines()

            for line in lines: #extract each line of the log file individually
                ips = re.findall(pattern_ip, line)#regex to find ips first

                sanitised_line = line
                for i, ip in enumerate(list(set(ips))): #replace real ip with placeholders for protecting privacy
                    sanitised_line = sanitised_line.replace(ip, f"ip_addr_{i}")

                # remove mac address entirely for same reason as ip
                sanitised_line = re.sub(pattern_mac, "[mac_redacted]", sanitised_line)

                #create dictionary for log entry 
                event = {
                    "event_id": str(uuid.uuid4())[:8],
                    "raw_sanitized_text": sanitised_line.strip(),
                    "detected_ips_count": len(ips),
                    "original_filename": src_file.split("//")[-1]
                }
                processed_events.append(event)

            # save dictionary as JSON for llm parsing 
            output_filename = src_file.split("//")[-1].replace(".log", ".json")
            dst_path = f"{dst_dir}//{output_filename}"

            with open(dst_path, "w") as f:
                json.dump(processed_events, f, indent=4)
            
            print(f"Success: Sanitised {len(processed_events)} events to {output_filename}")
            return dst_path 
    except Exception as e:
        print("Error processing file: " + str(e))

dir = [src_dir, dst_dir] 

# checks the directory for log files
def log_watcher():

    for i in dir: # check to see if the src and dst dirs exist
      isExist = os.path.exists(i)
      if isExist == False:
            sys.exit(f"Error: {i} is missing") # stops the program if dir doesnt exist
            

    print ("Checking for new logs...")

    # Get all files in the source folder
    all_files = os.listdir(src_dir)

    for file in all_files:
        #splits the file to get the extension
        file_name, file_ext = split_file(file)

        if file_ext in acc_ext: #checks the extension is valid
            print (f"Log File {file_name} is Valid")

            # appends file to the paths (used for dup and copying)
            src_dir_file = src_dir + "//" + file
            dst_dir_file = dst_dir + "//" + file

            # checks destination directory for duplicate file
            dir_dups = os.path.isfile(dst_dir_file)

            if dir_dups == False:
                try:
                    log_sanitiser(src_dir_file) # cleans file and changes into json    
                                     
                except Exception as e: 
                    print(f"Failed to copy file: str{e}")  
            else:
                print (file + " already exists in destination folder")
        else: 
            print ("Not a valid file extension") 

log_watcher()
