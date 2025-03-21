REM
@echo off

REM Check for Windows Terminal
where wt >nul 2>&1
if %errorlevel% neq 0 (
    echo Windows Terminal is not installed!
    echo Please install it from the Microsoft Store or use the older version with separate windows.
    echo Press any key to continue with separate windows...
    pause >nul
    goto :use_legacy
)

echo Checking dependencies...

rem Check for Node.js
node -v npm -v >nul 2>&1
if %errorlevel% neq 0 (
echo Node.js is not installed and npm is not installed! Please install Node.js with npm first.
echo Visit https://nodejs.org/ to download and install Node.js
pause
    exit /b 1
)

 rem Check for ngrok
 ngrok -v >nul 2>&1
 if %errorlevel% neq 0 (
     echo ngrok is not installed! Please install ngrok first.
     echo Installing ngrok globally...
    call npm install -g ngrok
     if %errorlevel% neq 0 (
         echo Failed to install ngrok! Please install it manually:
         echo npm install -g ngrok or visit https://ngrok.com/ to download
         pause
         exit /b 1
     )
)

echo Dependencies OK!
timeout /t 2 /nobreak >nul

echo Cleaning up existing processes...
REM Kill any process using port 3000 (usually Node.js)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000"') do taskkill /F /PID %%a 2>nul
REM Kill any running ngrok processes
taskkill /F /IM ngrok.exe 2>nul
echo Cleaned up existing processes
timeout /t 2 /nobreak >nul

rem Clean and build
echo Cleaning and building...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Build successful!
timeout /t 2 /nobreak >nul

REM Start ngrok in a new Windows Terminal tab
wt -w 0 new-tab --title "Ngrok Tunnel" cmd /k "echo Starting ngrok tunnel... && ngrok http 3000"
echo Started ngrok - check http://localhost:4040 for your URL
echo IMPORTANT: Copy the ngrok URL and add it to your GitHub webhook settings

REM Wait a moment for ngrok to start
timeout /t 2 /nobreak >nul

REM Start development server in the current terminal
echo Starting development server...
npm run dev
exit /b 0

:use_legacy
REM Legacy fallback using separate windows
start cmd /k "title Ngrok Tunnel && echo Starting ngrok tunnel... && ngrok http 3000"
echo Starting development server...
npm run dev