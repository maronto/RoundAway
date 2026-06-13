@echo off
echo =========================================
echo  Building RoundAway for Windows (Portable)
echo =========================================
call npm run build:win
echo =========================================
echo  Done! Check the dist/ folder.
echo =========================================
pause