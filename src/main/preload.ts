import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectVideo: () => ipcRenderer.invoke('select-video'),
  convertForPreview: (inputPath: string) => ipcRenderer.invoke('convert-for-preview', inputPath),
  cutVideo: (params: { inputPath: string; outputPath: string; startTime: number; endTime: number; resolution?: string; bitrate?: string }) =>
    ipcRenderer.invoke('cut-video', params),
  getVideoInfo: (filePath: string) => ipcRenderer.invoke('get-video-info', filePath),
  stopProcessing: () => ipcRenderer.invoke('stop-processing'),
  onCutProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('cut-progress', (_, progress) => callback(progress));
    return () => {
      ipcRenderer.removeAllListeners('cut-progress');
    };
  }
}); 