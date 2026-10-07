1. Core Installation

    Npcap: Downloaded and installed Npcap. During installation, the checkbox "Install Npcap in WinPcap API-compatible Mode" was selected.

    Snort: Downloaded the Snort 2.9.20 Win64 installer and installed it to C:\Snort.

    DLL Fix: Copied wpcap.dll and packet.dll from C:\Windows\SysWOW64 into C:\Snort\bin to resolve the Error 126 startup failure.

2. Manual File Creation

Snort requires the following files to exist in C:\Snort\rules or it will fail to start. These were created as empty text files (ensuring no .txt extension remained):

    local.rules (Added a test rule: alert icmp any any -> any any (msg:"ICMP Test"; sid:1000001; rev:1;))

    white_list.rules

    black_list.rules

3. Exact Changes to C:\Snort\etc\snort.conf

The following specific lines were modified to transition from Linux-style paths to Windows-style paths:

Path Variables (Step 1):
Plaintext

var RULE_PATH C:\Snort\rules
var SO_RULE_PATH C:\Snort\so_rules
var PREPROC_RULE_PATH C:\Snort\preproc_rules
var WHITE_LIST_PATH C:\Snort\rules
var BLACK_LIST_PATH C:\Snort\rules

Dynamic Libraries (Step 4):
Changed these to point to your specific Windows library folders:
Plaintext

dynamicpreprocessor directory C:\Snort\lib\snort_dynamicpreprocessor
dynamicengine directory C:\Snort\lib\snort_dynamicengine
# dynamicdetection directory C:\Snort\lib\snort_dynamicrules (Commented out if empty)

Output Configuration (Step 6):
Enabled the fast alert text output:
Plaintext

output alert_fast: alert.fast

Note: We also commented out output log_tcpdump to prevent the creation of large binary files.

Rule Includes (Step 7):
Commented out all community rules (e.g., # include $RULE_PATH/exploit.rules) and ensured only the following was active:
Plaintext

include $RULE_PATH/local.rules

4. Execution and Logging

    Interface Discovery: Ran snort -W to find that the Wi-Fi adapter was on Index 5.

    Automated Run Command: Created start_snort.bat to execute Snort with the following flags:

        -i 5: Listen on the Wi-Fi card.

        -c C:\Snort\etc\snort.conf: Use the modified config.

        -A console: Show alerts in the terminal.

        -l "C:\...\backend\raw-logs": Force all logs (specifically alert.fast) into your project folder.