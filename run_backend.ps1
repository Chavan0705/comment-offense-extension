$mavenVersion = "3.9.6"
$downloadUrl = "https://archive.apache.org/dist/maven/maven-3/$mavenVersion/binaries/apache-maven-$mavenVersion-bin.zip"
$zipPath = "$PSScriptRoot\.maven.zip"
$extractPath = "$PSScriptRoot\.maven"
$mvnPath = "$extractPath\apache-maven-$mavenVersion\bin\mvn.cmd"

# Check if Maven is already downloaded
if (-not (Test-Path $mvnPath)) {
    Write-Host "Downloading portable Apache Maven $mavenVersion..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
        Write-Host "Extracting Maven..." -ForegroundColor Cyan
        Expand-Archive -Path $zipPath -DestinationPath $extractPath
        Remove-Item -Path $zipPath -Force
        Write-Host "Maven downloaded and set up successfully." -ForegroundColor Green
    } catch {
        Write-Error "Failed to download Maven: $_"
        exit 1
    }
}

# Run the requested maven command
$mavenArgs = $args -join " "
if (-not $mavenArgs) {
    $mavenArgs = "test"
}

Write-Host "Executing: mvn $mavenArgs" -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
& $mvnPath $mavenArgs
