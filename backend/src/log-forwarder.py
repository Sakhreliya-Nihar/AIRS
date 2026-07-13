import os, datetime, sys, shutil, sys, json, re, cryptography
from cryptography.fernet import Fernet 

# key = Fernet.generate_key() #randomly generate a key
# fernet = Fernet.generate_key

src_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//raw-logs" # directory where raw logs come from an ids
dst_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//clean-logs" # raw logs cleaned and sent to dst

acc_ext = [".log", ".txt"] # accepted file extensions
#pattern_ip = re.search ("\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}") #regex for log sanitisation
#pattern_email = ("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

def split_file(file): #splits the file to get the extension
    split_file = os.path.splitext(file)
       
    # print("Filename = " + file_name); ..
    # print("Extension = " + file_ext ); ..

    # return both values
    return split_file[0], split_file[1]



def log_sanitiser(src_file):
    try: 
        with open(src_file, "r") as f: #open and read the raw log file
            raw_text = f.read()

        shutil.copy2(src_file, dst_dir) # copy to cleaned directory
        print ("Success: Copied file " + raw_text + " from " + src_dir + " to " + dst_dir)
       
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
