# Save the original directory so we can return to it later
$originalLocation = Get-Location

# Move to the inner jams/ folder where Flask can find the server app
$projectRoot = Resolve-Path "$PSScriptRoot\.."
$innerJamsPath = Join-Path $projectRoot "jams"
Set-Location $innerJamsPath

# Set environment variables for Flask to run with the server app
$env:FLASK_APP = "server:create_app"
$env:PYTHONPATH = $innerJamsPath
$env:FLASK_ENV = "development"  # Optional

Write-Host "=== JAMS Server DB Migration ==="
Write-Host "1) flask db init         - Initialise migrations folder (run once)"
Write-Host "2) flask db migrate      - Generate migration script"
Write-Host "3) flask db upgrade      - Apply latest migration to DB"
Write-Host "4) flask db downgrade    - Rollback last migration"
Write-Host "5) flask db current      - Show current migration"
Write-Host "6) quit"

$choice = Read-Host "Enter choice (1-6)"

switch ($choice) {
    "1" { flask db init }
    "2" { flask db migrate }
    "3" { flask db upgrade }
    "4" { flask db downgrade }
    "5" { flask db current }
    "6" { Write-Host "Cancelled." }
    default { Write-Host "Invalid choice." }
}

# Return to original directory
Set-Location $originalLocation
