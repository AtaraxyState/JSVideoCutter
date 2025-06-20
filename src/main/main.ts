import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
// @ts-ignore
import ffmpeg from 'fluent-ffmpeg';
import Store from 'electron-store';

const store = new Store();
let currentFFmpegProcess: any = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow loading local files
    }
  });

  // In development, load from localhost
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the build directory
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-video', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Web Compatible Videos', extensions: ['mp4', 'webm'] },
      { name: 'MP4 Videos', extensions: ['mp4'] },
      { name: 'WebM Videos', extensions: ['webm'] },
      { name: 'All Videos', extensions: ['mp4', 'webm', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'm4v'] }
    ]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('convert-for-preview', async (_, inputPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace(/\.[^/.]+$/, '_preview.mp4');
    
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .format('mp4')
      .outputOptions([
        '-movflags', 'faststart',
        '-preset', 'ultrafast',
        '-crf', '28'
      ])
      .output(outputPath)
      .on('end', () => {
        resolve(outputPath);
      })
      .on('error', (err: any) => {
        console.error('Preview conversion error:', err);
        reject(err);
      })
      .run();
  });
});

ipcMain.handle('cut-video', async (_, { inputPath, outputPath, startTime, endTime, resolution, bitrate }) => {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputPath);

    // Apply resolution if specified
    if (resolution && resolution !== 'original') {
      ffmpegCommand.size(resolution);
    }

    // Apply bitrate if specified
    if (bitrate && bitrate !== 'original') {
      ffmpegCommand.videoBitrate(bitrate);
    }

    // Store the process reference for potential cancellation
    currentFFmpegProcess = ffmpegCommand
      .on('progress', (progress: any) => {
        // Send progress updates to renderer
        BrowserWindow.getAllWindows()[0].webContents.send('cut-progress', progress);
      })
      .on('end', () => {
        currentFFmpegProcess = null;
        resolve({ success: true });
      })
      .on('error', (err: any) => {
        currentFFmpegProcess = null;
        console.error('FFmpeg error:', err);
        reject(err);
      });

    ffmpegCommand.run();
  });
});

ipcMain.handle('stop-processing', async () => {
  if (currentFFmpegProcess) {
    try {
      currentFFmpegProcess.kill('SIGTERM');
      currentFFmpegProcess = null;
      return { success: true };
    } catch (err) {
      console.error('Error stopping FFmpeg process:', err);
      throw err;
    }
  }
  return { success: true };
});

ipcMain.handle('get-video-info', async (_, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: any, metadata: any) => {
      if (err) {
        console.error('FFprobe error:', err);
        reject(err);
        return;
      }
      resolve(metadata);
    });
  });
}); 