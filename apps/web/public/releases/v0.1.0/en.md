# v0.1.0 — Initial Release

> 2026-02-21

## Features

### Photo Upload
- Drag & drop photos with automatic EXIF / GPS extraction
- Batch import with automatic sorting by capture time

### Interactive Map
- Interactive map powered by MapLibre GL
- Photos auto-clustered as markers, click to expand
- Auto-fit map view after upload

### Trajectory Replay
- Timeline-driven trajectory animation playback
- Play / pause / seek / speed controls
- Camera follows current position during replay
- Real-time photo card displayed in the top-right corner

### Video Recording
- Record replay as MP4 (H.264, WebCodecs)
- Auto fallback to WebM (MediaRecorder) when WebCodecs is unavailable
- Locusify logo animation as video intro
- Recording resolution capped at 1280px, bitrate 4 Mbps
- Save / discard panel shown after replay ends

### i18n
- Chinese / English multilingual support with automatic browser language detection
