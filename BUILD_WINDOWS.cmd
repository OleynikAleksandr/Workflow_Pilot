@echo off
setlocal DisableDelayedExpansion
set "ROOT=%~dp0"
set "NODE_DIR=%ROOT%windows-app\resources\windows-node\node-v24.21.0-win-x64"
if not exist "%NODE_DIR%\node.exe" (
  echo Bundled Windows Node.js is missing. Unpack the full windows-app distribution first. 1^>^&2
  exit /b 1
)
set "PATH=%NODE_DIR%;%PATH%"
pushd "%ROOT%" >nul
call npm.cmd run build:win
set "BUILD_EXIT=%ERRORLEVEL%"
popd >nul
exit /b %BUILD_EXIT%
