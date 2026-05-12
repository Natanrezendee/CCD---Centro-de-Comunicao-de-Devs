@echo off
cd /d "C:\Users\02902187\CCD"

start "" /min cmd /c ""C:\Users\02902187\AppData\Roaming\npm\http-server.cmd" -p 5501"

timeout /t 2 > nul

start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" ^
 --user-data-dir="%LOCALAPPDATA%\MeuAppProfile" ^
 --app=http://localhost:5501