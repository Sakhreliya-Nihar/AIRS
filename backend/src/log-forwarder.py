import os 
import time
import shutil
import sys

src_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//raw-logs" # directory where raw logs come from an ids
dst_dir = "C://Users//HP//OneDrive//Pictures//Documents//Desktop//AIRS//backend//clean-logs" # raw logs cleaned and sent to dst
acc_ext = [".log", ".txt"] # accepted file extensions

dir = [src_dir, dst_dir] 

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
        split_file = os.path.splitext(file)
       
        file_name = str(split_file[0]) 
        file_ext = str(split_file[1])

       # print("Filename = " + file_name); ..
        # print("Extension = " + file_ext ); ..

        if file_ext in acc_ext: #checks the extension is valid
            print (f"Log File {file_name} is Valid")

            # appends file to the paths (used for dup and copying)
            src_dir_file = src_dir + "//" + file
            dst_dir_file = dst_dir + "//" + file

            # checks destination directory for duplicate file
            dir_dups = os.path.isfile(dst_dir_file)
            # print(dst_dir_file);
            # print(dir_dups);

            if dir_dups == False:
                try:
                    shutil.copy2(src_dir_file, dst_dir) # copies file from src to dst
                    print ("Success: Copied file " + file + " from " + src_dir + " to " + dst_dir)

                except: 
                    print("Failed to copy file: " + RuntimeError) #need to look up which error is correct to use
            else:
                print (file + " already exists in destination folder")
        else: 
            print ("Not a valid file extension") 

log_watcher()
