1. Continuous File Monitoring (Custom tail -f Implementation)

    My Code:
    ```Python

    # Get current file size to see if new data was written
    try:
        current_size = os.path.getsize(src_path)
    except OSError:
        continue 

    last_pos = file_progress.get(file, 0)

    # If the file is smaller than before, it was likely truncated/rotated.
    if current_size < last_pos:
        last_pos = 0

    if current_size > last_pos:
        with open(src_path, "r", encoding="utf-8", errors="replace") as f:
            f.seek(last_pos) # JUMP directly to where we left off
            new_lines = f.readlines()

            if new_lines:
                log_sanitiser(new_lines, file) 

            # Update "bookmark"
            file_progress[file] = f.tell() 
            save_file_progress(file_progress)
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/17056382/reading-a-file-as-it-is-written-tail-f-in-python

        Thread: https://stackoverflow.com/questions/136168/get-last-n-lines-of-a-file-similar-to-tail

    The Snippet I learned from:
   ``` Python

    # The standard way to read a file as it grows without keeping it locked
    # is to remember the byte position (file.tell()) and seek to it later.
    with open('logfile.txt', 'r') as file:
        file.seek(last_position)
        for line in file:
            print(line)
        last_position = file.tell() # Save this for the next loop
    ```

2. Time-and-Size Based Batching for API Optimization

    My Code:
    ```Python

    # 1. Trigger batch if the size limit is reached
    if len(suspicious_buffer) >= BATCH_LIMIT:
        process_batch(suspicious_buffer) 
        suspicious_buffer = [] 

    # ... Later in the main loop ...

    # 2. Trigger batch if the time limit is reached (Timeout Logic)
    time_since_last_batch = time.time() - last_batch_time
    if len(suspicious_buffer) > 0 and time_since_last_batch >= MAX_WAIT_SECONDS:
        print(f"--- [TIMEOUT] Processing partial batch ---")
        process_batch(suspicious_buffer)
        suspicious_buffer = []
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/46623694/how-to-process-items-in-batches-with-a-time-limit-in-python

        Thread: https://stackoverflow.com/questions/14898230/python-how-to-implement-a-time-based-buffer

    The Snippet I learned from:
    ```Python

    # A standard buffer pattern checks both the length of the array
    # and the elapsed time to ensure data doesn't get stuck waiting forever.
    if len(buffer) >= max_size or (time.time() - start_time) > timeout:
        flush_buffer(buffer)
        buffer.clear()
        start_time = time.time()
    ```

3. Graceful JSON Parsing with Plain-Text Fallback

    My Code:
    ```Python

    try:
        # Parse the line as JSON (for Winlogbeat .ndjson files)
        log_data = json.loads(line)
        event_id_val = str(log_data.get("winlog", {}).get("event_id", ""))
        raw_message = log_data.get("message", "")

        if event_id_val:
            text_to_analyze = f"EventID {event_id_val}: {raw_message}"
        else:
            text_to_analyze = raw_message

    except json.JSONDecodeError:
        # If it fails (because it's an old plain text or .ids or .log file), just use the line directly
        text_to_analyze = line
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/11229080/python-parse-a-malformed-json-string

        Thread: https://stackoverflow.com/questions/44123305/how-to-handle-jsondecodeerror-in-python

    The Snippet I learned from:
    ```Python

    # Using a try/except block allows the script to natively handle 
    # mixed file types without crashing when it hits an unstructured line.
    try:
        data = json.loads(string_input)
    except ValueError: # ValueError or json.JSONDecodeError
        data = string_input # Treat as standard string
    ```

4. Data Sanitization and Contextual Indexing (Anonymizing IPs)

    My Code:
    ```Python

    # Separate into internal and external lists by checking the prefix
    internal_prefixes = ("192.168.", "10.", "172.", "fc", "fd", "fe80", "::1", "127.0.0.1")
    internal_ips = [ip for ip in unique_ips if ip.lower().startswith(internal_prefixes)]
    external_ips = [ip for ip in unique_ips if ip not in internal_ips]

    # Replace real IPs with indexed placeholders
    for i, ip in enumerate(external_ips):
        sanitised_line = sanitised_line.replace(ip, f"[EXTERNAL_IP_{i}]")

    for i, ip in enumerate(internal_ips):
        sanitised_line = sanitised_line.replace(ip, f"[INTERNAL_IP_{i}]")
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/16725895/python-regex-replace-ip-address

        Thread: https://stackoverflow.com/questions/52842994/replace-multiple-strings-in-python

    The Snippet I learned from:
    ```Python

    # Using enumerate() allows you to create numbered placeholders 
    # so the LLM can still track individual actors without seeing their real data.
    sensitive_words = ["apple", "banana"]
    for index, word in enumerate(sensitive_words):
        text = text.replace(word, f"[FRUIT_{index}]")
    ```

5. Cryptographic Integrity Hashing for Tamper Detection

    My Code:
    ```Python

    def generate_integrity_hash(event_id, text, timestamp):
        """Creates a SHA-256 hash of the core event data to ensure integrity."""
        # Combine the unique ID, the log text, and the timestamp string
        combined_string = f"{event_id}|{text}|{timestamp}"
        return hashlib.sha256(combined_string.encode()).hexdigest()
    ```

    Source / Stack Overflow:

        Thread: https://stackoverflow.com/questions/5297448/how-to-get-md5-sum-of-a-string-using-python (Updated for SHA-256)

        Thread: https://stackoverflow.com/questions/27522626/hash-string-in-python

    The Snippet I learned from:
    ```python
    # The hashlib library requires strings to be encoded to bytes before hashing.
    import hashlib
    data_string = "my_important_data"
    # .encode('utf-8') converts it safely, and hexdigest() returns the readable string
    hash_result = hashlib.sha256(data_string.encode('utf-8')).hexdigest()
    ```