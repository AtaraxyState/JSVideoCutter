# Video Cutter

A modern desktop application for cutting video files, built with Electron and React. This application provides a beautiful, responsive user interface for previewing and cutting video files with precision.

## Features

- Modern, responsive UI built with Material-UI
- Video preview with timeline controls
- Precise timestamp selection for cutting
- Progress tracking during video processing
- Support for multiple video formats (MP4, AVI, MKV, MOV, WMV)
- Dark mode interface

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- FFmpeg installed on your system

### Installing FFmpeg

#### Windows
1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract the downloaded archive
3. Add the `bin` folder to your system's PATH environment variable

#### macOS
```bash
brew install ffmpeg
```

#### Linux
```bash
sudo apt update
sudo apt install ffmpeg
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/videocutter-electron.git
cd videocutter-electron
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Building the Application

To create a production build:

```bash
npm run build
npm run build:electron
```

The packaged application will be available in the `release` directory.

## Usage

1. Launch the application
2. Click "Select Video" to choose a video file
3. Use the video player controls or sliders to set start and end times
4. Click "Cut Video" to process the video
5. The cut video will be saved in the same directory as the original file with "_cut" appended to the filename

## Development

The project uses:
- Electron for the desktop application framework
- React for the user interface
- Material-UI for styling
- FFmpeg for video processing
- TypeScript for type safety

### Project Structure

```
videocutter-electron/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.ts     # Main process entry point
│   │   └── preload.ts  # Preload script
│   └── renderer/       # React application
│       ├── App.tsx     # Main React component
│       └── index.tsx   # React entry point
├── package.json
└── tsconfig.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Material-UI](https://mui.com/)
- [FFmpeg](https://ffmpeg.org/) 