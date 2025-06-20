import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Slider,
  TextField,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Chip,
  Stack,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';
import PreviewIcon from '@mui/icons-material/Preview';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';

declare global {
  interface Window {
    electronAPI: {
      selectVideo: () => Promise<string | null>;
      convertForPreview: (inputPath: string) => Promise<string>;
      cutVideo: (params: {
        inputPath: string;
        outputPath: string;
        startTime: number;
        endTime: number;
        resolution?: string;
        bitrate?: string;
      }) => Promise<{ success: boolean }>;
      getVideoInfo: (filePath: string) => Promise<any>;
      onCutProgress: (callback: (progress: any) => void) => () => void;
      stopProcessing: () => Promise<void>;
    };
  }
}

interface TimeSegment {
  id: number;
  startTime: number;
  endTime: number;
  name: string;
}

type ViewMode = 'original' | 'segment';

const VideoContainer = styled(Box)({
  position: 'relative',
  backgroundColor: '#000',
  borderRadius: '8px',
  overflow: 'hidden',
  marginBottom: '1rem',
});

const VideoCanvas = styled('video')({
  width: '100%',
  height: 'auto',
  maxHeight: '400px',
  display: 'block',
  backgroundColor: '#000',
});

const VideoControls = styled(Box)({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
  padding: '20px 16px 16px',
  color: 'white',
});

const TimelineContainer = styled(Box)({
  position: 'relative',
  height: '60px',
  backgroundColor: '#2a2a2a',
  borderRadius: '4px',
  margin: '1rem 0',
  overflow: 'hidden',
});

const SegmentOverlay = styled(Box)<{ startPercent: number; widthPercent: number; isActive?: boolean }>(
  ({ startPercent, widthPercent, isActive }) => ({
    position: 'absolute',
    top: '50%',
    left: `${startPercent}%`,
    width: `${widthPercent}%`,
    height: '20px',
    backgroundColor: isActive ? '#ff5722' : '#4caf50',
    borderRadius: '2px',
    transform: 'translateY(-50%)',
    opacity: 0.8,
    border: isActive ? '2px solid #ff5722' : '1px solid #4caf50',
    cursor: 'pointer',
    '&:hover': {
      opacity: 1,
    },
  })
);

const App: React.FC = () => {
  console.log("App component rendered!");
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  // Video states
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [videoPreviewFile, setVideoPreviewFile] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // View mode states
  const [viewMode, setViewMode] = useState<ViewMode>('original');
  const [previewingSegment, setPreviewingSegment] = useState<TimeSegment | null>(null);
  
  // Segment states
  const [segments, setSegments] = useState<TimeSegment[]>([]);
  const [newSegmentStart, setNewSegmentStart] = useState<number>(0);
  const [newSegmentEnd, setNewSegmentEnd] = useState<number>(10);
  
  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Output settings
  const [outputResolution, setOutputResolution] = useState<string>('original');
  const [outputBitrate, setOutputBitrate] = useState<string>('original');

  const resolutionOptions = [
    { value: 'original', label: 'Original' },
    { value: '1920x1080', label: '1080p (1920x1080)' },
    { value: '1280x720', label: '720p (1280x720)' },
    { value: '854x480', label: '480p (854x480)' },
    { value: '640x360', label: '360p (640x360)' },
  ];

  const bitrateOptions = [
    { value: 'original', label: 'Original' },
    { value: '8000k', label: 'High (8 Mbps)' },
    { value: '4000k', label: 'Medium (4 Mbps)' },
    { value: '2000k', label: 'Low (2 Mbps)' },
    { value: '1000k', label: 'Very Low (1 Mbps)' },
  ];

  const handleFileSelect = useCallback(async () => {
    try {
      const filePath = await window.electronAPI.selectVideo();
      if (filePath) {
        setVideoFile(filePath);
        setVideoPreviewFile(null);
        setError(null);
        setSegments([]);
        setIsPlaying(false);
        setIsConverting(false);
        setViewMode('original');
        setPreviewingSegment(null);
        
        const extension = filePath.split('.').pop()?.toLowerCase();
        const isWebCompatible = extension === 'mp4' || extension === 'webm';
        
        try {
          const info = await window.electronAPI.getVideoInfo(filePath);
          setVideoInfo(info);
          const videoDuration = info.format.duration || 0;
          setDuration(videoDuration);
          setNewSegmentEnd(Math.min(10, videoDuration));
          
          if (isWebCompatible) {
            setVideoPreviewFile(filePath);
          } else {
            setIsConverting(true);
            setError('Converting video for preview... This may take a moment.');
            try {
              const previewPath = await window.electronAPI.convertForPreview(filePath);
              setVideoPreviewFile(previewPath);
              setError(null);
            } catch (convErr) {
              console.error('Conversion error:', convErr);
              setError('Could not convert video for preview. You can still cut the video, but preview may not work.');
              setVideoPreviewFile(filePath);
            } finally {
              setIsConverting(false);
            }
          }
        } catch (err) {
          console.error('Error getting video info:', err);
          setError('Could not load video information. Video preview may still work.');
          setVideoPreviewFile(filePath);
        }
      }
    } catch (err) {
      setError('Error selecting video file');
    }
  }, []);

  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      if (viewMode === 'original') {
        setDuration(videoDuration);
        if (!videoInfo) {
          setNewSegmentEnd(Math.min(10, videoDuration));
        }
      }
    }
  }, [videoInfo, viewMode]);

  const togglePlayPause = useCallback(async () => {
    if (videoRef.current) {
      try {
        if (isPlaying) {
          videoRef.current.pause();
          setIsPlaying(false);
        } else {
          await videoRef.current.play();
          setIsPlaying(true);
        }
      } catch (err) {
        console.error('Error toggling play/pause:', err);
        setIsPlaying(false);
      }
    }
  }, [isPlaying]);

  const stopVideo = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume === 0) {
        setIsMuted(true);
        videoRef.current.muted = true;
      } else if (isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && videoContainerRef.current) {
      videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const previewSegment = useCallback((segment: TimeSegment) => {
    if (videoRef.current && videoPreviewFile) {
      setViewMode('segment');
      setPreviewingSegment(segment);
      // Set video to segment start time
      videoRef.current.currentTime = segment.startTime;
      setCurrentTime(segment.startTime);
    }
  }, [videoPreviewFile]);

  const returnToOriginal = useCallback(() => {
    setViewMode('original');
    setPreviewingSegment(null);
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  }, []);

  const addSegment = useCallback(() => {
    const newSegment: TimeSegment = {
      id: Date.now(),
      startTime: newSegmentStart,
      endTime: newSegmentEnd,
      name: `Segment ${segments.length + 1}`,
    };
    setSegments([...segments, newSegment]);
  }, [segments, newSegmentStart, newSegmentEnd]);

  const removeSegment = useCallback((id: number) => {
    setSegments(segments.filter(segment => segment.id !== id));
    if (previewingSegment?.id === id) {
      returnToOriginal();
    }
  }, [segments, previewingSegment, returnToOriginal]);

  const stopProcessing = useCallback(async () => {
    try {
      await window.electronAPI.stopProcessing();
      setIsProcessing(false);
      setProgress(0);
    } catch (err) {
      console.error('Error stopping processing:', err);
    }
  }, []);

  const cutSegment = useCallback(async (segment: TimeSegment) => {
    if (!videoFile) return;

    setIsProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const fileExtension = videoFile.split('.').pop();
      const baseName = videoFile.replace(/\.[^/.]+$/, '');
      const outputPath = `${baseName}_${segment.name.replace(/\s+/g, '_')}.${fileExtension}`;
      
      await window.electronAPI.cutVideo({
        inputPath: videoFile,
        outputPath,
        startTime: segment.startTime,
        endTime: segment.endTime,
        resolution: outputResolution !== 'original' ? outputResolution : undefined,
        bitrate: outputBitrate !== 'original' ? outputBitrate : undefined,
      });
      setError(null);
    } catch (err) {
      setError(`Error cutting ${segment.name}`);
    } finally {
      setIsProcessing(false);
    }
  }, [videoFile, outputResolution, outputBitrate]);

  const cutAllSegments = useCallback(async () => {
    if (!videoFile || segments.length === 0) return;

    setIsProcessing(true);
    setError(null);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      try {
        const fileExtension = videoFile.split('.').pop();
        const baseName = videoFile.replace(/\.[^/.]+$/, '');
        const outputPath = `${baseName}_${segment.name.replace(/\s+/g, '_')}.${fileExtension}`;
        
        await window.electronAPI.cutVideo({
          inputPath: videoFile,
          outputPath,
          startTime: segment.startTime,
          endTime: segment.endTime,
          resolution: outputResolution !== 'original' ? outputResolution : undefined,
          bitrate: outputBitrate !== 'original' ? outputBitrate : undefined,
        });
      } catch (err) {
        setError(`Error cutting ${segment.name}`);
        break;
      }
    }
    setIsProcessing(false);
  }, [videoFile, segments, outputResolution, outputBitrate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle segment preview time constraints
  useEffect(() => {
    if (viewMode === 'segment' && previewingSegment && videoRef.current) {
      const video = videoRef.current;
      const checkTime = () => {
        if (video.currentTime >= previewingSegment.endTime) {
          video.pause();
          setIsPlaying(false);
          video.currentTime = previewingSegment.startTime;
          setCurrentTime(previewingSegment.startTime);
        }
      };
      
      video.addEventListener('timeupdate', checkTime);
      return () => video.removeEventListener('timeupdate', checkTime);
    }
  }, [viewMode, previewingSegment]);

  useEffect(() => {
    if (isProcessing) {
      const cleanup = window.electronAPI.onCutProgress((progress) => {
        setProgress(progress.percent || 0);
      });
      return cleanup;
    }
  }, [isProcessing]);

  const getCurrentDuration = () => {
    if (viewMode === 'segment' && previewingSegment) {
      return previewingSegment.endTime - previewingSegment.startTime;
    }
    return duration;
  };

  const getCurrentTime = () => {
    if (viewMode === 'segment' && previewingSegment) {
      return currentTime - previewingSegment.startTime;
    }
    return currentTime;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Video Cutter
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ mb: 3 }}>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={handleFileSelect}
                disabled={isProcessing}
                fullWidth
              >
                Select Video
              </Button>
            </Box>

            {videoFile && (
              <>
                {/* View Mode Selector */}
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    icon={<VideoLibraryIcon />}
                    label="Original Video"
                    color={viewMode === 'original' ? 'primary' : 'default'}
                    onClick={returnToOriginal}
                    disabled={isConverting}
                  />
                  {previewingSegment && (
                    <Chip
                      icon={<PreviewIcon />}
                      label={`Preview: ${previewingSegment.name}`}
                      color={viewMode === 'segment' ? 'secondary' : 'default'}
                      onClick={() => previewSegment(previewingSegment)}
                      disabled={isConverting}
                    />
                  )}
                </Stack>

                {isConverting ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 2 }}>
                      Converting video for preview...
                    </Typography>
                  </Box>
                ) : (
                  <VideoContainer ref={videoContainerRef}>
                    <VideoCanvas
                      ref={videoRef}
                      src={videoPreviewFile || videoFile}
                      preload="metadata"
                      onTimeUpdate={handleVideoTimeUpdate}
                      onLoadedMetadata={handleVideoLoadedMetadata}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onError={(e) => {
                        console.error('Video error:', e);
                        setError('Error loading video preview. The file might be in an unsupported format for preview, but cutting should still work.');
                      }}
                    />
                    
                    {/* Custom Video Controls */}
                    <VideoControls>
                      <Box sx={{ mb: 1 }}>
                        <Slider
                          value={getCurrentTime()}
                          onChange={(_, value) => {
                            const newTime = value as number;
                            if (viewMode === 'segment' && previewingSegment) {
                              seekTo(previewingSegment.startTime + newTime);
                            } else {
                              seekTo(newTime);
                            }
                          }}
                          min={0}
                          max={getCurrentDuration()}
                          step={0.1}
                          sx={{ color: '#90caf9' }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton onClick={togglePlayPause} sx={{ color: 'white' }}>
                            {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                          </IconButton>
                          <IconButton onClick={stopVideo} sx={{ color: 'white' }}>
                            <StopIcon />
                          </IconButton>
                          <Typography variant="body2" sx={{ minWidth: '80px' }}>
                            {formatTime(getCurrentTime())} / {formatTime(getCurrentDuration())}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton onClick={toggleMute} sx={{ color: 'white' }}>
                            {isMuted || volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                          </IconButton>
                          <Slider
                            value={volume}
                            onChange={(_, value) => handleVolumeChange(value as number)}
                            min={0}
                            max={1}
                            step={0.1}
                            sx={{ width: 80, color: '#90caf9' }}
                          />
                          <IconButton onClick={toggleFullscreen} sx={{ color: 'white' }}>
                            {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                          </IconButton>
                        </Box>
                      </Box>
                    </VideoControls>
                  </VideoContainer>
                )}



                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Output Settings
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Resolution</InputLabel>
                        <Select
                          value={outputResolution}
                          onChange={(e: SelectChangeEvent) => setOutputResolution(e.target.value)}
                          disabled={isProcessing}
                        >
                          {resolutionOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Bitrate</InputLabel>
                        <Select
                          value={outputBitrate}
                          onChange={(e: SelectChangeEvent) => setOutputBitrate(e.target.value)}
                          disabled={isProcessing}
                        >
                          {bitrateOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Add New Segment
                  </Typography>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={4}>
                      <TextField
                        label="Start Time (s)"
                        type="number"
                        value={newSegmentStart}
                        onChange={(e) => setNewSegmentStart(Number(e.target.value))}
                        disabled={isProcessing}
                        fullWidth
                        inputProps={{ min: 0, max: duration, step: 0.1 }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        label="End Time (s)"
                        type="number"
                        value={newSegmentEnd}
                        onChange={(e) => setNewSegmentEnd(Number(e.target.value))}
                        disabled={isProcessing}
                        fullWidth
                        inputProps={{ min: 0, max: duration, step: 0.1 }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={addSegment}
                        disabled={isProcessing || newSegmentStart >= newSegmentEnd}
                        fullWidth
                      >
                        Add Segment
                      </Button>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setNewSegmentStart(currentTime)}
                    >
                      Use Current Time as Start
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      onClick={() => setNewSegmentEnd(currentTime)}
                      sx={{ ml: 1 }}
                    >
                      Use Current Time as End
                    </Button>
                  </Box>
                </Box>
              </>
            )}

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {isProcessing && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <CircularProgress variant="determinate" value={progress} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Processing: {progress.toFixed(1)}%
                </Typography>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={stopProcessing}
                  sx={{ mt: 1 }}
                >
                  Stop Processing
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Segments ({segments.length})
            </Typography>
            
            {segments.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<ContentCutIcon />}
                onClick={cutAllSegments}
                disabled={isProcessing}
                fullWidth
                sx={{ mb: 2 }}
              >
                Cut All Segments
              </Button>
            )}

            <List>
              {segments.map((segment, index) => (
                <React.Fragment key={segment.id}>
                  <ListItem
                    sx={{
                      bgcolor: previewingSegment?.id === segment.id ? 'action.selected' : 'transparent',
                      borderRadius: 1,
                    }}
                    secondaryAction={
                      <Box>
                        <IconButton
                          edge="end"
                          aria-label="preview"
                          onClick={() => previewSegment(segment)}
                          disabled={isProcessing || isConverting}
                          sx={{ mr: 1 }}
                        >
                          <PreviewIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="cut"
                          onClick={() => cutSegment(segment)}
                          disabled={isProcessing}
                          sx={{ mr: 1 }}
                        >
                          <ContentCutIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => removeSegment(segment.id)}
                          disabled={isProcessing}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={segment.name}
                      secondary={`${formatTime(segment.startTime)} - ${formatTime(segment.endTime)} (${formatTime(segment.endTime - segment.startTime)})`}
                    />
                  </ListItem>
                  {index < segments.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>

            {segments.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center">
                No segments added yet. Add segments using the controls on the left.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default App; 