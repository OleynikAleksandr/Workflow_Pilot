# Balloon notification for turn_watchdog. Ported unchanged from the pinned Windows package (server/windows_notify.ps1).
param(
    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $true)]
    [string]$Message
)

$ErrorActionPreference = "SilentlyContinue"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$notification = New-Object System.Windows.Forms.NotifyIcon
$notification.Icon = [System.Drawing.SystemIcons]::Information
$notification.Visible = $true
$notification.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]::Info
$notification.BalloonTipTitle = $Title
$notification.BalloonTipText = $Message
$notification.ShowBalloonTip(10000)

Start-Sleep -Seconds 12
$notification.Dispose()
