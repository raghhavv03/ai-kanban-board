# Stop and remove the Kanban app container (Windows).
$container = "kanban-app"

docker rm -f $container 2>$null | Out-Null

Write-Host "Stopped $container"
