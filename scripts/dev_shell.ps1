# Save the original directory so we can return to it later
$originalLocation = Get-Location

# Get the absolute path to the inner jams/ directory
$projectRoot = Resolve-Path "$PSScriptRoot\.."
$innerJamsPath = Join-Path $projectRoot "jams"

Set-Location $innerJamsPath

Write-Host "Which app shell would you like to start?"
Write-Host "1) Web"
Write-Host "2) Server"
Write-Host "3) Quit"

$choice = Read-Host "Enter choice (1-3)"

switch ($choice) {
    "1" {
        $env:FLASK_APP = "web:create_app"
        $env:PYTHONPATH = $innerJamsPath
        Write-Host "Starting Flask shell for WEB..."
        flask shell
    }
    "2" {
        $env:FLASK_APP = "server:create_app"
        $env:PYTHONPATH = $innerJamsPath
        Write-Host "Starting Flask shell for SERVER..."
        flask shell
    }
    "3" {
        Write-Host "Cancelled."
    }
    default {
        Write-Host "Invalid choice."
    }
}

# Return to original directory
Set-Location $originalLocation
