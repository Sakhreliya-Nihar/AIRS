import sys, os, re, json, time
from dotenv import load_dotenv
from google import genai
from google.genai.types import GenerateContentConfig

# tells Python to look one folder up (in the 'src' folder) 
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from security.crypto import encrypt_payload, decrypt_payload

print("--- STARTING MANUAL UNIT TESTS ---")

# ==========================================
# UT-01 to UT-03: DATA SANITIZATION PIPELINE
# ==========================================

# 1. Provide the patterns so the test doesn't crash
pattern_mac = re.compile(r'(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}')
pattern_email = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
pattern_win_user_path = re.compile(r'(C:\\Users\\[a-zA-Z0-9_]+)')
pattern_passwords = re.compile(r'(?i)(password|passwd|pwd)\s*[=:]\s*([^\s]+)')
pattern_ip = re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b')
pattern_ipv6 = re.compile(r'(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}', re.IGNORECASE)

# 2. A "Mega-Log" containing every single vulnerability
raw_log = "Login failed for matthew.fish@students.plymouth.ac.uk in C:\\Users\\MattFish\\app.exe from 192.168.1.150 (MAC: 00:1B:44:11:3A:B7). External Call to 8.8.8.8. password=SuperSecret123!"

# 3. The Sanitization Logic (FIXED the \U Unicode Escape Bug)
sanitised_line = re.sub(pattern_mac, "[MAC_REDACTED]", raw_log)
sanitised_line = re.sub(pattern_email, "[EMAIL_REDACTED]", sanitised_line) 
sanitised_line = re.sub(pattern_win_user_path, r"C:\\Users\\[WINDOWS_USER_DIR]", sanitised_line) # Fixed line
sanitised_line = re.sub(pattern_passwords, r'\1=[PASSWORD_REDACTED]', sanitised_line) 

# 4. IP Sorting Logic
ips_v4 = re.findall(pattern_ip, sanitised_line)
ips_v6 = re.findall(pattern_ipv6, sanitised_line)
unique_ips = sorted(list(set(ips_v4 + ips_v6)))

internal_prefixes = ("192.168.", "10.", "172.", "fc", "fd", "fe80", "::1", "127.0.0.1")   
internal_ips = [ip for ip in unique_ips if str(ip).lower().startswith(internal_prefixes)]
external_ips = [ip for ip in unique_ips if ip not in internal_ips]

for i, ip in enumerate(external_ips):
    sanitised_line = sanitised_line.replace(ip, f"[EXTERNAL_IP_{i}]")
        
for i, ip in enumerate(internal_ips):
    sanitised_line = sanitised_line.replace(ip, f"[INTERNAL_IP_{i}]")

print(f"Original String: \n{raw_log}\n")
print(f"Sanitized Result: \n{sanitised_line}")

# ==========================================
# UT-04: AES CRYPTOGRAPHIC ENGINE
# ==========================================
print("\n--- UT-04: ENCRYPTION & DECRYPTION ---")

test_incident_payload = {
    "status": "Processed",
    "log_data": sanitised_line, 
    "risk_score": 7
}

print(f"\n[3] Payload Ready for Encryption: \n{test_incident_payload}")

# Encrypt it
ciphertext = encrypt_payload(test_incident_payload)
print(f"\n[4] Ciphertext: \n{ciphertext}")

# Decrypt it
decrypted_payload = decrypt_payload(ciphertext)
print(f"\n[5] Decrypted Payload: \n{decrypted_payload}")

# Verify
if test_incident_payload == decrypted_payload:
    print("\n[RESULT]: PASS! Sanitized data was successfully encrypted and decrypted without corruption.")
else:
    print("\n[RESULT]: FAIL! Data corruption occurred.")

# ==========================================
# UT-05: AI PERSONA PROMPT GENERATION
# ==========================================
print("\n--- UT-05: AI PERSONA PROMPT LOGIC ---")

# We extract the exact dictionary logic from your log-forwarder.py
def test_persona_generation(tech_level):
    prompts = {
        "business_owner": (
            "Analyze these logs for a non-technical Business Owner (SME). "
            "Your goal is to provide absolute clarity without technical jargon."
        ),
        "it_support": (
            "Analyze these logs for a Junior IT Sysadmin. "
            "Use standard IT terminology. Focus on what service is failing..."
        ),
        "soc_analyst": (
            "Analyze these logs for a Senior Security Analyst (SOC). "
            "Be extremely technical. Focus on attack vectors, payload analysis..."
        )
    }
    # Default to business_owner if an invalid string is passed
    return prompts.get(tech_level, prompts["business_owner"])

# Test 1: The Business Owner (Non-Technical)
print("[Test A: Requesting 'business_owner' prompt]")
bo_prompt = test_persona_generation("business_owner")
print(f"Result: {bo_prompt}\n")

# Test 2: The SOC Analyst (Highly Technical)
print("[Test B: Requesting 'soc_analyst' prompt]")
soc_prompt = test_persona_generation("soc_analyst")
print(f"Result: {soc_prompt}\n")

# Test 3: Edge Case / Invalid Input (Should safely default to Business Owner)
print("[Test C: Requesting invalid 'hacker' prompt]")
edge_prompt = test_persona_generation("hacker")
print(f"Result (Fallback): {edge_prompt}\n")

if "non-technical" in bo_prompt and "extremely technical" in soc_prompt:
    print("[RESULT]: PASS! The system dynamically loads the correct LLM instruction set based on user role.")
else:
    print("[RESULT]: FAIL! Prompts did not match expected output.")

# ==========================================
# UT-06: LOG PARSING & INGESTION LOGIC
# ==========================================
print("\n--- UT-06: LOG PARSING (JSON vs TEXT) ---")

# Scenario A: A structured JSON log (Mimicking Winlogbeat)
winlogbeat_log = '{"message": "Failed login attempt", "winlog": {"event_id": "4625"}}'

# Scenario B: An unstructured text log (Mimicking Snort alert.ids)
snort_log = "03/24-10:30:05.123 [**] [1:1000001:1] Malicious Traffic [**] {TCP} 192.168.1.50:443"

def test_parsing_logic(line):
    """This mirrors the exact logic inside log_sanitiser function"""
    try:
        # Try to parse as JSON
        log_data = json.loads(line)
        event_id_val = str(log_data.get("winlog", {}).get("event_id", ""))
        raw_message = log_data.get("message", "")
        
        if event_id_val:
            text_to_analyze = f"EventID {event_id_val}: {raw_message}"
        else:
            text_to_analyze = raw_message
        print(f"[JSON Parsed Successfully] Extracted: {text_to_analyze}")
        
    except json.JSONDecodeError:
        # Fallback for plain text logs
        text_to_analyze = line
        print(f"[Text Parsed Successfully] Extracted: {text_to_analyze}")

# Run the tests
test_parsing_logic(winlogbeat_log)
test_parsing_logic(snort_log)

# ==========================================
# UT-07 & UT-08: THREAT & NOISE FILTERING
# ==========================================
print("\n--- UT-07 & UT-08: THREAT & NOISE FILTERING ---")

# Pulling your exact dictionaries from log-forwarder.py
WEB_ATTACKS = ["<script>", "union select", "../", "whoami"]
AUTH_ATTACKS = ["failed password", "4625", "invalid user"]
SUSPICIOUS_KEYWORDS = WEB_ATTACKS + AUTH_ATTACKS

KNOWN_SAFE_PATTERNS = ["session opened", "4624", "favicon.ico"]

def is_suspicious(line):
    return any(keyword in line.lower() for keyword in SUSPICIOUS_KEYWORDS)

def is_noise(line):
    return any(pattern in line.lower() for pattern in KNOWN_SAFE_PATTERNS)

# UT-09 Test
malicious_log = "08:00 - Failed password for user admin from 10.0.0.5"
benign_log = "08:05 - User loaded the homepage successfully"

print(f"[UT-08] Malicious Log Suspicious? {is_suspicious(malicious_log)} (Expected: True)")
print(f"[UT-08] Benign Log Suspicious? {is_suspicious(benign_log)} (Expected: False)")

# UT-10 Test
noisy_log = "WinEventLog: 4624 Successful Logon for System Idle Process"
actual_threat = "WinEventLog: 4625 Failed Logon Attempt"

print(f"[UT-09] Is 4624 considered Noise? {is_noise(noisy_log)} (Expected: True)")
print(f"[UT-09] Is 4625 considered Noise? {is_noise(actual_threat)} (Expected: False)")


# ==========================================
# UT-09: STATE MANAGEMENT (FILE PROGRESS)
# ==========================================
print("\n--- UT-09: STATE MANAGEMENT (FILE PROGRESS) ---")

TRACKING_FILE = "test_log_progress.json"

def save_file_progress(progress_data):
    with open(TRACKING_FILE, 'w') as f:
        json.dump(progress_data, f)

def get_file_progress():
    if os.path.exists(TRACKING_FILE):
        with open(TRACKING_FILE, 'r') as f:
            return json.load(f)
    return {}

# 1. Save fake state
mock_state = {"apache_attack.log": 1054, "auth.log": 500}
save_file_progress(mock_state)

# 2. Retrieve it
retrieved_state = get_file_progress()
print(f"[UT-10] Retrieved State: {retrieved_state}")

# 3. Verify
if mock_state == retrieved_state:
    print("[RESULT] PASS! State persistence correctly saves and loads byte positions.")
else:
    print("[RESULT] FAIL! State mismatch.")

# Clean up test file
if os.path.exists(TRACKING_FILE):
    os.remove(TRACKING_FILE)

# ==========================================
# UT-10: NOTIFICATION THRESHOLD LOGIC
# ==========================================
print("\n--- UT-10: NOTIFICATION THRESHOLDS ---")

def should_notify(pref, risk):
    """Extracted exactly from line 224 of log-forwarder.py"""
    return (pref == "all") or (pref == "high" and risk >= 6) or (pref == "critical" and risk >= 8)

# Test Scenarios
print(f"Test A (Pref: High, Risk: 5) -> Send Email? {should_notify('high', 5)} (Expected: False)")
print(f"Test B (Pref: High, Risk: 7) -> Send Email? {should_notify('high', 7)} (Expected: True)")
print(f"Test C (Pref: Critical, Risk: 7) -> Send Email? {should_notify('critical', 7)} (Expected: False)")
print(f"Test D (Pref: Critical, Risk: 9) -> Send Email? {should_notify('critical', 9)} (Expected: True)")


# ==========================================
# UT-11: LLM HALLUCINATION FALLBACK
# ==========================================
print("\n--- UT-11: LLM FALLBACK LOGIC ---")

def parse_llm_response(ai_response_dict):
    """Mirrors lines 192-203 of log-forwarder.py"""
    risk = ai_response_dict.get("risk_assessment", {}).get("score", 1)
    
    raw_steps = ai_response_dict.get("mitigation_plan", [])
    formatted_steps = [
        f"Step {step.get('step_number', '?')}: {step.get('action_title', 'Action')}" 
        for step in raw_steps
    ]

    # The Graceful Degradation logic
    if not formatted_steps:
        formatted_steps = ["Review logs manually"]
        
    return risk, formatted_steps

# Scenario A: A perfect LLM response
perfect_response = {
    "risk_assessment": {"score": 8},
    "mitigation_plan": [{"step_number": 1, "action_title": "Block IP"}]
}

# Scenario B: A broken LLM response (Missing mitigation plan entirely)
broken_response = {
    "risk_assessment": {"score": 5}
    # Notice mitigation_plan is completely missing!
}

print(f"Perfect LLM Parsed: {parse_llm_response(perfect_response)}")
print(f"Broken LLM Parsed (Fallback Triggered): {parse_llm_response(broken_response)}")

# ==========================================
# UT-12: GEMINI BATCH PROCESSING & API TEST
# ==========================================
print("\n--- UT-12: GEMINI BATCH PROCESSING & API TEST ---")

# 1. Load API key safely from the .env file
ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(ENV_PATH)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# 2. Create a mock batch of 3 distinct logs (mimicking suspicious_buffer)
mock_batch = [
    {"event_id": "TEST-001", "raw_sanitised_text": "Failed password for root from [EXTERNAL_IP_0]"},
    {"event_id": "TEST-002", "raw_sanitised_text": "SQL Injection UNION SELECT detected from [EXTERNAL_IP_1]"},
    {"event_id": "TEST-003", "raw_sanitised_text": "Multiple 404 errors (DirBuster scan) from [EXTERNAL_IP_2]"}
]

print(f"Created mock batch of {len(mock_batch)} logs.")

# 3. Combine them exactly like process_batch() does
combined_text = "\n".join([f"ID {item['event_id']}: {item['raw_sanitised_text']}" for item in mock_batch])
persona_instruction = "Analyze these logs for a Senior Security Analyst (SOC). Be extremely technical."

# 4. Call the Live API
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("Sending batch to Gemini API. Awaiting response (10-20 seconds)...")

    response = client.models.generate_content(
        model='gemini-2.5-flash-lite',
        config=GenerateContentConfig(response_mime_type="application/json"),
        contents=f"""
        {persona_instruction}

        LOGS:
        {combined_text}
        
        CRITICAL RULE: You MUST analyze EVERY SINGLE LOG ENTRY. 
        If you receive 3 logs, you MUST return a JSON list containing exactly 3 objects. 
        Maintain a strict 1-to-1 ratio based on the event_id.

        Return ONLY a JSON list matching this structure:
        [
            {{ 
                "event_id": "id", 
                "analysis": {{"incident_overview": "..."}}, 
                "risk_assessment": {{"score": 5}}, 
                "mitigation_plan": [{{"step_number": 1, "action_title": "Block IP"}}] 
            }}
        ]
        """
    )

    # 5. Parse the output
    raw_text = response.text.replace("```json", "").replace("```", "").strip()
    ai_results = json.loads(raw_text)

    print(f"\n[SUCCESS] Received {len(ai_results)} parsed objects back from Gemini.")
    for res in ai_results:
        print(f" -> Processed Event ID: {res.get('event_id')} | Risk Score: {res.get('risk_assessment', {}).get('score')}")

    # 6. Verification
    if len(ai_results) == len(mock_batch):
        print("\n[RESULT]: PASS! The LLM successfully processed the batch and returned exactly 1 summary per log without dropping data.")
    else:
        print("\n[RESULT]: FAIL! The LLM grouped or dropped logs.")

except Exception as e:
    print(f"\n[API ERROR]: {e}")