@echo off
title Snort IDS - Live Monitor
echo Starting Snort...
echo Logging to: C:\Users\HP\OneDrive\Pictures\Documents\Desktop\AIRS\backend\raw-logs
echo.

C:\Snort\bin\snort -i 5 -c C:\Snort\etc\snort.conf -l "C:\Users\HP\OneDrive\Pictures\Documents\Desktop\AIRS\backend\raw-logs" -A fast 

pause