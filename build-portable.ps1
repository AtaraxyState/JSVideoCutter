# Video Cutter - Portable Build Script
# This script builds a portable executable that can run on any Windows computer

param(
    [string]$OutputDir = "dist-portable",
    [switch]$Clean = $false,
    [switch]$SkipInstall = $false
)

Write-Host "=== Video Cutter Portable Build Script ===" -ForegroundColor Cyan
Write-Host "Building portable executable for Windows..." -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "Error: package.json not found. Please run this script from the project root directory."
    exit 1
}

# Clean previous builds if requested
if ($Clean -and (Test-Path $OutputDir)) {
    Write-Host "Cleaning previous build directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force $OutputDir
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Error: Node.js is not installed or not in PATH. Please install Node.js first."
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "npm version: $npmVersion" -ForegroundColor Green
} catch {
    Write-Error "Error: npm is not available. Please ensure npm is installed with Node.js."
    exit 1
}

# Install dependencies if not skipped
if (-not $SkipInstall) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: Failed to install dependencies."
        exit 1
    }
} else {
    Write-Host "Skipping dependency installation..." -ForegroundColor Yellow
}

# Install electron-builder if not already installed
Write-Host "Checking electron-builder..." -ForegroundColor Yellow
$electronBuilderInstalled = npm list electron-builder --depth=0 2>$null
if (-not $electronBuilderInstalled -or $electronBuilderInstalled -match "UNMET DEPENDENCY") {
    Write-Host "Installing electron-builder..." -ForegroundColor Yellow
    npm install --save-dev electron-builder
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error: Failed to install electron-builder."
        exit 1
    }
}

# Set homepage for relative paths in React build
Write-Host "Setting homepage for relative paths..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$packageJson | Add-Member -Name "homepage" -Value "./" -MemberType NoteProperty -Force
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"

# Update build configuration for portable build
Write-Host "Configuring build settings for portable executable..." -ForegroundColor Yellow

# Create a temporary package.json with portable build settings
$packageJson = Get-Content "package.json" | ConvertFrom-Json

# Update build configuration for portable
$packageJson.main = "build/electron.js"
$packageJson.build.directories.output = $OutputDir
$packageJson.build.win.target = @(
    @{
        target = "portable"
        arch = @("x64")
    }
)

# Add portable-specific settings
if (-not $packageJson.build.portable) {
    $packageJson.build | Add-Member -Name "portable" -Value @{
        artifactName = "VideoCutter-Portable.exe"
    } -MemberType NoteProperty
}

# Ensure files include the built React app
$packageJson.build.files = @(
    "build/**/*",
    "dist/**/*", 
    "node_modules/**/*",
    "package.json"
)

# Write temporary package.json
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json.tmp"

# Add build script if it doesn't exist
if (-not $packageJson.scripts.build) {
    Write-Host "Adding build script to package.json..." -ForegroundColor Yellow
    $packageJson.scripts | Add-Member -Name "build" -Value "react-scripts build" -MemberType NoteProperty
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
}

if (-not $packageJson.scripts."build-electron") {
    Write-Host "Adding electron build script to package.json..." -ForegroundColor Yellow
    $packageJson.scripts | Add-Member -Name "build-electron" -Value "tsc -p tsconfig.electron.json" -MemberType NoteProperty
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
}

if (-not $packageJson.scripts."dist") {
    Write-Host "Adding distribution script to package.json..." -ForegroundColor Yellow
    $packageJson.scripts | Add-Member -Name "dist" -Value "npm run build && npm run build-electron && electron-builder --publish=never" -MemberType NoteProperty
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
}

# Build React app
Write-Host "Building React application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error: Failed to build React application."
    exit 1
}

# Build Electron main process
Write-Host "Building Electron main process..." -ForegroundColor Yellow
npx tsc -p tsconfig.electron.json
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error: Failed to build Electron main process."
    exit 1
}

# Copy main process files to build directory for electron-builder
Write-Host "Copying main process files to build directory..." -ForegroundColor Yellow
if (-not (Test-Path "build")) {
    Write-Error "Error: React build directory not found."
    exit 1
}

Copy-Item "dist/main/main.js" "build/electron.js" -Force
Copy-Item "dist/main/preload.js" "build/preload.js" -Force

# Temporarily replace package.json for portable build
if (Test-Path "package.json.tmp") {
    Move-Item "package.json" "package.json.backup"
    Move-Item "package.json.tmp" "package.json"
}

# Create portable executable
Write-Host "Creating portable executable..." -ForegroundColor Yellow
npx electron-builder --win portable --publish=never
$buildResult = $LASTEXITCODE

# Restore original package.json
if (Test-Path "package.json.backup") {
    Move-Item "package.json" "package.json.tmp"
    Move-Item "package.json.backup" "package.json"
    Remove-Item "package.json.tmp" -ErrorAction SilentlyContinue
}

if ($buildResult -ne 0) {
    Write-Error "Error: Failed to create portable executable."
    exit 1
}

# Check if build was successful
$portableExe = Get-ChildItem -Path $OutputDir -Filter "*.exe" -Recurse | Select-Object -First 1
if ($portableExe) {
    Write-Host "=== BUILD SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Portable executable created: $($portableExe.FullName)" -ForegroundColor Green
    Write-Host "File size: $([math]::Round($portableExe.Length / 1MB, 2)) MB" -ForegroundColor Green
    Write-Host ""
    Write-Host "The portable executable can be run on any Windows computer without installation." -ForegroundColor Cyan
    Write-Host "Simply copy the .exe file to any location and double-click to run." -ForegroundColor Cyan
    
    # Open the output directory
    Write-Host "Opening output directory..." -ForegroundColor Yellow
    Start-Process "explorer.exe" -ArgumentList $OutputDir
} else {
    Write-Error "Error: Portable executable not found in output directory."
    exit 1
}

Write-Host ""
Write-Host "=== Build Complete ===" -ForegroundColor Cyan 