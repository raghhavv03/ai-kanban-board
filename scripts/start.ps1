# Build and run the Kanban app container (Windows).
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

$image = "kanban-app"
$container = "kanban-app"

docker build -t $image .
docker rm -f $container 2>$null | Out-Null

$envArgs = @()
if (Test-Path ".env") { $envArgs = @("--env-file", ".env") }

docker run -d --name $container -p 8000:8000 @envArgs $image

Write-Host "Kanban app running at http://localhost:8000"
