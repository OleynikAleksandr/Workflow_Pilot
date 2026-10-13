@echo off
setlocal DisableDelayedExpansion
set "WORKFLOW_ROOT=%~dp0.."
set "PATH=%WORKFLOW_ROOT%\.harness\runtime\git\cmd;%WORKFLOW_ROOT%\.harness\runtime\git\usr\bin;%PATH%"
if not exist "%WORKFLOW_ROOT%\.harness\runtime\node.exe" (
  echo Workflow runtime is missing. Open this project in Project Workflow Kit. 1>&2
  exit /b 1
)
"%WORKFLOW_ROOT%\.harness\runtime\node.exe" "%~dp0workflow.mjs" %*
exit /b %errorlevel%
