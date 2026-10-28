@echo off
rem Opens MyMarathon (development version) in one click:
rem API in one window, web app in another, then the browser.
rem Close the two windows to stop everything.
cd /d "%~dp0"

if not exist "backend\.venv\Scripts\python.exe" (
  echo Environnement Python introuvable : voir README.md, section "Lancer le backend".
  pause
  exit /b 1
)
if not exist "app\node_modules" (
  echo Dependances de l'app absentes : lance "npm install" dans le dossier app.
  pause
  exit /b 1
)

rem A previous web server left running (node.exe on port 8081) would block the new one: stop it.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":8081 .*LISTENING"') do (
  tasklist /fi "pid eq %%p" | find /i "node.exe" >nul && taskkill /f /pid %%p >nul 2>&1
)

start "MyMarathon - API" /d "%~dp0backend" cmd /k ".venv\Scripts\python manage.py migrate && .venv\Scripts\python manage.py runserver 0.0.0.0:8000"

rem The browser page calls the API on this PC (overrides app\.env, which targets the phone's Wi-Fi address).
start "MyMarathon - Web" /d "%~dp0app" cmd /k "set EXPO_PUBLIC_API_URL=http://localhost:8000&& npx expo start --web --port 8081"

echo MyMarathon demarre : le navigateur s'ouvre tout seul dans quelques secondes (http://localhost:8081).
timeout /t 5 >nul
