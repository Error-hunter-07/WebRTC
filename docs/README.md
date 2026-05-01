# Watch Together - Real-Time Video Sync & Streaming App

**Watch Together** is a peer-to-peer web application that enables real-time synchronized video playback across multiple devices. The host controls playback (play, pause, seek) and all viewers stay perfectly in sync via WebRTC and Socket.IO signaling. Phase 3 adds webcam and microphone support for live participant video and audio streams.

## Project Overview

Watch Together solves the problem of synchronized watching: instead of everyone needing their own copy of a video file, the host can share their screen or webcam feed directly to viewers via WebRTC, with automatic audio/video synchronization via Socket.IO heartbeats.

### Key Features

- **Phase 1: Sync Engine** — Socket.IO-based playback synchronization (play/pause/seek/heartbeat drift correction)
- **Phase 2: Peer-to-Peer Streaming** — Host video stream captured via `video.captureStream()` and relayed to viewers via WebRTC data channels
- **Phase 3: Webcam & Microphone** — Live participant video tiles, mic toggle with muting indicator, speaking volume detection, quality/FPS control

### Architecture

- **Frontend:** React + Vite (client/), custom hooks for media management
- **Backend:** Node.js + Express + Socket.IO (server/), stateless relay for WebRTC signaling
- **Real-Time:** Socket.IO for room management, heartbeat sync, media state notifications; WebRTC for P2P video/audio
- **Scalability:** Tested for 4 simultaneous viewers per host

### Technology Stack

- React 19.1.0 (functional components + hooks)
- Vite 7.0.0 (bundler & dev server)
- Socket.IO 4.8.1 (real-time signaling)
- WebRTC (peer-to-peer media)
- CSS Modules (styling, no external libraries)
- Plain JavaScript ES Modules (no TypeScript)

### Supported Browsers

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14.1+ (with `playsInline` attribute)
- **Not supported:** iOS Safari video.captureStream() (Phase 2 fallback to manual file load)

---

## File Structure

```
WebRTC/
├── server/
│   ├── index.js                     # Express + Socket.IO server
│   └── package.json
├── client/
│   ├── src/
│   │   ├── App.jsx                  # Main orchestrator (Phase 3: delegates to RoomScreen)
│   │   ├── App.module.css           # Styling for app layout, toolbar, panels
│   │   ├── index.css                # Global styles
│   │   ├── main.jsx                 # React entry point
│   │   ├── socket.js                # Socket.IO singleton (untouchable)
│   │   ├── sync.js                  # SyncEngine class (untouchable)
│   │   ├── webrtc.js                # WebRTCManager class (Phase 2+)
│   │   ├── components/
│   │   │   ├── LobbyScreen.jsx      # Pre-join UI
│   │   │   ├── RoomScreen.jsx       # Main room orchestrator
│   │   │   ├── VideoPlayer.jsx      # Video element + wrapper
│   │   │   ├── ControlBar.jsx       # Custom playback controls
│   │   │   ├── WebcamGrid.jsx       # Participant tiles
│   │   │   ├── ChatPanel.jsx        # Message list + input
│   │   │   └── PeoplePanel.jsx      # Members list
│   │   └── hooks/
│   │       ├── useMediaDevices.js   # Camera/mic toggle, speaking detection
│   │       └── useMediaConnections.js # Peer connections for webcam/mic
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
├── docs/
│   ├── README.md                    # This file
│   ├── RUNNING.md                   # How to run locally and deploy
│   ├── ARCHITECTURE.md              # System design, data flow
│   └── IMPLEMENTATION.md            # Phase 1, 2, 3 implementation details
├── package.json                     # Root workspace config (npm workspaces)
└── .gitignore
```

---

## Getting Started Quick Reference

### Prerequisites

- Node.js 18.0+
- npm 9.0+
- Webcam/microphone (Phase 3) or local video file (Phase 1+2)

### Installation

```bash
# Install root + all workspaces
npm install

# Run dev server + client (concurrent)
npm run dev

# Build client for production
npm run build
```

See [RUNNING.md](RUNNING.md) for detailed deployment instructions.

---

## Phase Breakdown

### Phase 1: Sync Engine (Core)
- Socket.IO room creation/join
- Host broadcasts play/pause/seek events
- Host heartbeat every 3 seconds
- Viewer drift correction (>0.5s offset triggers restore)
- Chat system

### Phase 2: WebRTC Streaming
- Host calls `video.captureStream()` to get MediaStream from local video file
- Mesh topology: one RTCPeerConnection per viewer
- Host relays offer/answer/ICE candidates via Socket.IO
- Viewer receives video stream into video element
- Fallback: If `captureStream()` unavailable, viewer can load file manually

### Phase 3: Webcam & Microphone (Current)
- Separate `useMediaDevices()` hook for cam/mic control
- Separate `useMediaConnections()` hook for peer-to-peer webcam/mic streams
- Custom ControlBar with play/pause, seek, quality, FPS controls
- WebcamGrid component renders participant tiles
- Speaking volume detection for UI feedback
- Quality/FPS controls for bandwidth optimization
- iOS-safe playsInline + muted attributes

---

## Key Concepts

### Socket.IO Events (Unchanged from Phase 1)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `create-room` | client→server | Host creates room, gets roomId |
| `join-room` | client→server | Viewer joins room by ID |
| `sync-event` | client↔server | PLAY/PAUSE/SEEK events, relayed by server |
| `heartbeat` | host→server→viewers | Current video.currentTime every 3s |
| `chat` | client↔server | Chat messages broadcast to room |

### Socket.IO Events (Phase 2: WebRTC Signaling)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `webrtc-offer` | client↔server | SDP offer for video stream |
| `webrtc-answer` | client↔server | SDP answer |
| `webrtc-ice` | client↔server | ICE candidates |
| `request-stream` | viewer→server | Viewer requests video from host |
| `host-loaded-video` | host→server | Notify viewers video is loaded |
| `host-stream-ready` | host→server | Notify viewers capture stream started |

### Socket.IO Events (Phase 3: Media & State)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `media-offer` | client↔server | SDP offer for webcam/mic stream |
| `media-answer` | client↔server | SDP answer |
| `media-ice` | client↔server | ICE candidates for media |
| `cam-state` | host→server→room | Broadcast: camera on/off |
| `mic-state` | host→server→room | Broadcast: mic muted/unmuted |

---

## Code Examples

### Starting a Room (Phase 1)
```jsx
const startRoom = type => {
  socket.emit(type, { username: 'Alice' }, res => {
    if (res.ok) {
      setRoomId(res.roomId);
      setIsHost(type === 'create-room');
    }
  });
};
```

### Loading Video File (Phase 2)
```jsx
const onFileSelect = (file) => {
  const url = URL.createObjectURL(file);
  videoRef.current.src = url;
  // Host initiates WebRTC when metadata loads
};
```

### Toggling Camera (Phase 3)
```jsx
import { useMediaDevices } from './hooks/useMediaDevices';

const { camOn, toggleCam, localStream } = useMediaDevices();

// Grid shows localStream in self tile
<WebcamGrid
  participants={[
    { socketId: socket.id, username: 'You', stream: localStream, camOn, isSelf: true }
  ]}
/>
```

---

## Performance Notes

- **Network:** 1080p@60fps ≈ 2.5 Mbps; 480p@30fps ≈ 500 kbps
- **CPU:** Seek bar uses `requestAnimationFrame` for smooth 60fps updates
- **Audio:** Speaking detection uses 100ms polling interval
- **Browser:** All major browsers tested; iOS Safari lacks video.captureStream()

---

## License & Credits

Built as a demonstration of real-time WebRTC + Socket.IO synchronization.
