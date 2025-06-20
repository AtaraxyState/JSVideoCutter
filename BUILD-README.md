# Video Cutter - Portable Build Instructions

This document explains how to build a portable executable of the Video Cutter application that can run on any Windows computer without requiring Node.js or other dependencies.

## Prerequisites

- **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- **Windows PowerShell** (comes with Windows)
- **Git** (optional, for cloning the repository)

## Quick Build

1. **Open PowerShell** in the project directory
2. **Run the build script**:
   ```powershell
   .\build-portable.ps1
   ```

That's it! The script will handle everything automatically.

## Build Options

The build script supports several optional parameters:

### Clean Build
Remove previous build files before building:
```powershell
.\build-portable.ps1 -Clean
```

### Custom Output Directory
Specify a different output directory:
```powershell
.\build-portable.ps1 -OutputDir "my-custom-output"
```

### Skip Dependency Installation
Skip npm install (useful for subsequent builds):
```powershell
.\build-portable.ps1 -SkipInstall
```

### Combined Options
```powershell
.\build-portable.ps1 -Clean -OutputDir "release" -SkipInstall
```

## What the Script Does

1. **Validates Environment**: Checks for Node.js and npm
2. **Installs Dependencies**: Runs `npm install --legacy-peer-deps`
3. **Installs electron-builder**: If not already present
4. **Configures Build**: Sets up portable build configuration
5. **Builds React App**: Compiles the frontend with `npm run build`
6. **Builds Electron**: Compiles TypeScript main process
7. **Creates Portable Executable**: Uses electron-builder to package everything
8. **Opens Output Directory**: Shows you where the .exe file is located

## Output

The build process creates:
- **VideoCutter-Portable.exe** - The portable executable (~150-200 MB)
- **Latest.yml** - Update information file (can be ignored)

## Using the Portable Executable

The resulting `.exe` file is completely portable:

✅ **Can run on any Windows computer**  
✅ **No installation required**  
✅ **No Node.js or dependencies needed**  
✅ **Includes FFmpeg for video processing**  
✅ **Self-contained with all necessary files**  

Simply copy `VideoCutter-Portable.exe` to any Windows computer and double-click to run!

## Troubleshooting

### PowerShell Execution Policy Error
If you get an execution policy error, run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Build Fails with "electron-builder not found"
The script should install electron-builder automatically. If it fails, manually install:
```powershell
npm install --save-dev electron-builder
```

### FFmpeg Issues
The portable build includes FFmpeg binaries. If video processing doesn't work:
1. Ensure the build completed successfully
2. Check that the output executable is not corrupted
3. Try running the development version first to test functionality

### Large File Size
The portable executable is large (~150-200 MB) because it includes:
- Electron runtime
- Node.js runtime
- React application
- FFmpeg binaries
- All npm dependencies

This is normal for Electron applications and ensures it works on any computer.

## File Structure After Build

```
dist-portable/
├── VideoCutter-Portable.exe    # The portable executable
├── latest.yml                  # Update metadata (optional)
└── builder-debug.yml          # Build debug info (optional)
```

## Distribution

To distribute your application:
1. Run the build script
2. Take the `VideoCutter-Portable.exe` file from the output directory
3. Share this single file with users
4. Users can run it directly without any installation

The executable is self-contained and includes everything needed to run the Video Cutter application! 