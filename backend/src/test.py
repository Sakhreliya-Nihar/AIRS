import random
from datetime import datetime, timedelta

# Configuration - Exact Counts!
NUM_THREATS = 1000 
NUM_NOISE = 500  
FILENAME = "stress_test.log"

# Templates for our logs
NOISE_TEMPLATES = [
    "[**] [1:2100469:7] GPL ICMP_INFO PING *NIX [**] [Classification: Misc activity] [Priority: 3] {{ICMP}} 10.0.{}.{} -> 192.168.1.100",
    "[**] [1:2018959:2] ET POLICY PE EXE or DLL Windows file download HTTP [**] [Classification: Potential Corporate Privacy Violation] [Priority: 1] {{TCP}} 192.168.1.{}:{} -> 104.18.32.7:80",
    "[**] [1:2014819:2] ET INFO Session Traversal Utilities for NAT (STUN) Binding Request [**] [Classification: Misc activity] [Priority: 3] {{UDP}} 192.168.1.{}:{} -> 172.217.14.206:3478"
]

THREAT_TEMPLATES = [
    "[**] [1:2010937:3] ET WEB_SERVER Possible SQL Injection Attempt UNION SELECT [**] [Classification: Web Application Attack] [Priority: 1] {{TCP}} {}.{}.{}.{}:{} -> 192.168.1.100:80",
    "[**] [1:2001219:3] ET SCAN Potential SSH Scan [**] [Classification: Attempted Information Leak] [Priority: 2] {{TCP}} {}.{}.{}.{}:{} -> 192.168.1.100:22",
    "[**] [1:2013028:2] ET EXPLOIT Possible CVE-2014-6271 (Shellshock) [**] [Classification: Attempted Administrator Privilege Gain] [Priority: 1] {{TCP}} {}.{}.{}.{}:{} -> 192.168.1.100:80"
]

def generate_log():
    logs = []
    
    # 1. Generate exactly 1000 threats
    for _ in range(NUM_THREATS):
        template = random.choice(THREAT_TEMPLATES)
        logs.append(template.format(random.randint(1,255), random.randint(1,255), random.randint(1,255), random.randint(1,255), random.randint(10000, 60000)))

    # 2. Generate exactly 500 noise logs
    for _ in range(NUM_NOISE):
        template = random.choice(NOISE_TEMPLATES)
        logs.append(template.format(random.randint(1,255), random.randint(1,255), random.randint(10000, 60000)))

    # 3. Shuffle them all together so the threats are hidden randomly
    random.shuffle(logs)

    # 4. Write to file with sequential timestamps
    base_time = datetime(2026, 5, 12, 10, 0, 0)
    with open(FILENAME, 'w') as f:
        for i, log_line in enumerate(logs):
            current_time = base_time + timedelta(milliseconds=i * 15)
            timestamp_str = current_time.strftime("%m/%d-%H:%M:%S.%f")[:-3]
            f.write(f"{timestamp_str}  {log_line}\n")

    print(f"✅ Successfully generated EXACTLY {NUM_THREATS} Threats and {NUM_NOISE} Noise logs!")
    print(f"Saved to: {FILENAME}")

if __name__ == "__main__":
    generate_log()