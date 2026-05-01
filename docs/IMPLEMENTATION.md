# Implementation Details — Phases 1, 2, 3

This document describes what has been implemented in each phase and what was tested.

---

## Phase 1: Sync Engine (✅ COMPLETE & VERIFIED)

### What Was Built

**Goal:** Socket.IO-based playback synchronization between host and viewers.

### Features Implemented

1. **Room Management (server/index.js)**
   - `create-room`: Host generates 6-char hex room ID, stored in memory as `rooms = Map<roomId, {hostId, members, usernames}>`
   - `join-room`: Viewer joins by room ID, added to members array
   - Automatic host reassignment: if host leaves, next member becomes host
   - Room cleanup: deleted from memory when last member leaves

2. **Playback Sync (client/src/sync.js)**
   - `SyncEngine` class: listens to video element play/pause/seeked events
   - Host mode: emits `sync-event` ({type: PLAY/PAUSE/SEEK, time, roomId}) and `heartbeat` ({time}) every 3 seconds
   - Viewer mode: receives sync-events, applies play/pause/seek via `video.currentTime` and `video.play()/pause()`
   - Drift correction: if |video.currentTime - heartbeat.time| > 0.5s, jump to heartbeat time
   - Echo prevention: `isSyncing` flag temporarily ignores local events while applying remote changes

3. **Chat System (client/src/App.jsx)**
   - `chat` events broadcast to all room members
   - Message display with username and timestamp

4. **UI Feedback**
   - "In sync / Syncing..." indicator based on drift magnitude
   - Room ID display + copy-to-clipboard
   - Members list showing host badge
   - "Host left" banner when host disconnects

### Server Contract (HTTP Endpoints)

- **GET /health** → `{"ok": true}` (health check)

### Server Contract (Socket.IO Events)

| Event | Sender | Receiver | Payload |
|-------|--------|----------|---------|
| `create-room` | Client | Server | `{username}` |
| `join-room` | Client | Server | `{roomId, username}` |
| `sync-event` | Host | Server | `{type, time, roomId}` |
| `heartbeat` | Host | Server | `{time, roomId}` |
| `chat` | Any | Server | `{roomId, message, username}` |
| `room-joined` | Server | Client | `{roomId, members, hostId}` |
| `user-joined` | Server | Room | `{socketId, username, members}` |
| `host-changed` | Server | Room | `{hostId, members}` |
| `host-left` | Server | Room | `{socketId}` |
| `user-left` | Server | Room | `{socketId, reason}` |
| `chat` | Server | Room | `{username, message, socketId, ts}` |

### Testing Completed (Manual)

✅ Room creation and join flow  
✅ Member list updates on join/leave  
✅ Play/pause sync within 200ms latency  
✅ Seek sync (jump to timestamp)  
✅ Skip ±10s buttons emit SEEK  
✅ Drift correction (heartbeat every 3s, correct if >0.5s difference)  
✅ Chat messages broadcast and display  
✅ Host disconnect → reassignment to next member  
✅ Mobile layout responsive  

---

## Phase 2: WebRTC P2P Streaming (✅ COMPLETE & VERIFIED)

### What Was Added

**Goal:** Host captures video via `video.captureStream()` and streams directly to viewers via WebRTC, so viewers don't need their own file copy.

### Features Implemented

1. **Host Video Capture (client/src/webrtc.js)**
   - `WebRTCManager.initHost(videoElement)`: calls `videoElement.captureStream(fps)` to get MediaStream
   - Creates one `RTCPeerConnection` per viewer (mesh topology)
   - Adds all video/audio tracks from localStream to each peer
   - Sets up ICE candidate handling and onconnectionstatechange listeners

2. **Viewer Stream Reception (client/src/webrtc.js)**
   - `WebRTCManager.initViewer(videoElement)`: emits "request-stream" to host
   - Receives WebRTC offer, creates peer connection, sends answer
   - `ontrack` event fires → assigns stream to `video.srcObject`
   - Syncs with Phase 1 SyncEngine: host heartbeat controls play/pause/seek on viewer video element

3. **WebRTC Signaling (server/index.js + client/src/webrtc.js)**
   - Server relays: "webrtc-offer", "webrtc-answer", "webrtc-ice"
   - Client: creates offer/answer, gathers ICE candidates, applies remote descriptors
   - Max 4 simultaneous viewers per host (configurable `MAX_VIEWERS`)
   - Fallback: if `captureStream()` unavailable, viewer can manually load file (Phase 1 mode)

4. **Browser Compatibility & Edge Cases**
   - iOS Safari: `captureStream()` not supported → graceful degradation to file upload
   - Firefox: uses `mozCaptureStream()` (abstracted in webrtc.js)
   - TURN server support: reads `VITE_TURN_URL`, `VITE_TURN_USER`, `VITE_TURN_CREDENTIAL` from env

5. **UI Updates (client/src/App.jsx)**
   - Host: "Streaming to X viewers" status badge
   - Viewer: "Stream connected ✓" when `ontrack` fires
   - Fallback prompt: "Direct streaming not supported. Please load file manually."
   - Host-left banner + chat preserved during disconnect

### Server Contract (New Socket.IO Events)

| Event | Sender | Receiver | Payload |
|-------|--------|----------|---------|
| `request-stream` | Viewer | Server | `{roomId}` |
| `webrtc-offer` | Host | Server | `{offer, targetSocketId, roomId}` |
| `webrtc-answer` | Viewer | Server | `{answer, targetSocketId}` |
| `webrtc-ice` | Either | Server | `{candidate, targetSocketId}` |
| `host-loaded-video` | Host | Server | `{roomId}` |
| `host-stream-ready` | Host | Server | `{roomId}` |
| `viewer-wants-stream` | Server | Host | `{roomId, viewerSocketId}` |
| `host-loaded-video` | Server | Room | `{roomId, socketId}` |
| `host-stream-ready` | Server | Room | `{roomId, hostSocketId}` |

### Testing Completed (Manual)

✅ Host loads local MP4 → viewer receives stream within 2 seconds  
✅ Viewer video plays with lip-sync (Phase 1 sync controls playback)  
✅ Play/pause sync: host clicks play → viewer video plays within 300ms  
✅ Seek sync: host seeks to 1:30 → viewer jumps to 1:30  
✅ Host disconnect → viewer shows "Host left"  
✅ Multiple viewers (2+) → separate peer connections per viewer  
✅ Browser console: no CORS/WebRTC errors  
✅ Network tab: video bitrate visible, approximately 1-2 Mbps for 480p  
✅ iOS fallback: manual file load prompt shown  

### Architecture Notes

- **Video transmission:** `captureStream(fps)` on host video element captures playback, not device camera (Phase 3 adds device camera)
- **No transcoding:** Bitstream relayed as-is; browser encoder handles codec
- **Bandwidth:** Host → Viewers is the bottleneck. Each viewer ~1-2 Mbps; 4 viewers = 4-8 Mbps upstream needed
- **Latency:** ~100-500ms depending on network; tighter with quality reduction

---

## Phase 3: Webcam & Microphone (🚧 IN PROGRESS)

### What To Build

**Goal:** Participants can turn on webcam/mic tiles, see each other live, mute indication, and quality controls.

### Architecture

#### New Files to Create

```
client/src/
├── hooks/
│   ├── useMediaDevices.js       # Camera/mic toggle, speaking detection
│   └── useMediaConnections.js   # Peer connections for webcam/mic
├── components/
│   ├── LobbyScreen.jsx          # Pre-join (split from App.jsx)
│   ├── RoomScreen.jsx           # Main room orchestrator
│   ├── VideoPlayer.jsx          # Video wrapper
│   ├── ControlBar.jsx           # Custom playback controls
│   ├── WebcamGrid.jsx           # Participant tiles
│   ├── ChatPanel.jsx            # Chat (split from App.jsx)
│   └── PeoplePanel.jsx          # Members list (split from App.jsx)
```

#### New Files to Modify

- `server/index.js`: Add socket handlers for media signaling
- `client/src/webrtc.js`: Add `setQuality(quality, fps)` method
- `client/src/App.module.css`: Rewrite for new layout

### Components: Detailed Design

#### **LobbyScreen.jsx**

Entry screen before room join.

Props:
- `onCreateRoom(username)`: Handler to create room
- `onJoinRoom(username, roomId)`: Handler to join room
- `error`: Error banner text

Renders:
- Logo/title
- Username input
- "Create Room" button
- "Join Room" (input + button)
- Error message if join fails

#### **RoomScreen.jsx**

Main orchestrator after room join. Receives all state from App.jsx.

Props:
- All state variables (roomId, isHost, members, videoSrc, streamConnected, etc.)
- All handlers (onFileSelect, onLeave, etc.)

Renders:
- TopBar
- MainArea (VideoPlayer + WebcamGrid)
- BottomToolbar (mic, cam, play, chat, people, leave)
- ChatPanel (fixed side)
- PeoplePanel (fixed side)

#### **VideoPlayer.jsx**

Video element + custom ControlBar.

Props:
- `videoRef`: ref to video element
- `isHost`: bool
- `videoSrc`: string (for <video src>)
- `streamConnected`: bool (for status)
- `hostLoaded`: bool (for status)
- `manualFallback`: bool (for fallback UI)
- `onFileSelect(file)`: file input handler
- `syncText`: "In sync" / "Syncing..." text

Renders:
- File input (host/fallback only)
- `<video ref={videoRef} controls={false} ...>`
- ControlBar wrapper

#### **ControlBar.jsx**

Custom control bar (no native browser controls).

Props:
- `videoRef`: to control playback
- `isHost`: disable seek/skip for viewers
- `onQualityChange(quality, fps)`: Quality dropdown handler
- `onFpsChange(fps)`: FPS dropdown handler (alternative two-param variant)

Features:
- **Left:** Skip -10s | Play/Pause | Skip +10s | Time (MM:SS or HH:MM:SS)
- **Center:** Seek slider (range input, full width)
- **Right:** Volume | Mute | Quality dropdown | FPS dropdown | Fullscreen

Behavior:
- Host: all buttons active
- Viewer: seek/skip/play/pause disabled (pointer-events:none, opacity:0.5)
- Seeking: updates video.currentTime, SyncEngine emits SEEK
- Quality: emit onQualityChange, parent calls webrtcManager.setQuality()
- Fullscreen: standard fullscreen API

CSS:
- Nestled in VideoPlayer wrapper with position:absolute bottom
- Hover to show (desktop), always visible (mobile)
- Smooth opacity transition

#### **WebcamGrid.jsx**

Horizontal strip of participant tiles.

Props:
- `participants`: [{socketId, username, stream, camOn, micMuted, isSelf}, ...]
- `speakingVolume`: {socketId: 0-255}

Renders:
- Flex container, overflow-x auto
- Per participant:
  - If camOn + stream: `<video srcObject={stream} autoPlay playsInline muted={isSelf}>`
  - If camOff: grey div with first letter of username
  - Speaking glow: if speakingVolume[id] > 30, box-shadow green pulse
  - Muted badge: if micMuted, red mic-off icon (bottom-left corner)
  - Username label: below tile, truncated
  - Self tile: CSS transform:scaleX(-1) (mirror) + "You" badge

Sizing:
- Desktop: 160x120px tiles, 140px strip height
- Mobile: 80x60px tiles, 80px strip height

#### **ChatPanel.jsx** & **PeoplePanel.jsx**

These are extracted from the old App.jsx. Rendered as fixed side panels on desktop, full-screen overlay on mobile.

ChatPanel Props:
- `messages`: [{username, message, ts}, ...]
- `onSend(text)`: send handler
- `username`: current user
- `open`: bool
- `onClose()`: close handler

PeoplePanel Props:
- `members`: [{socketId, username, isHost, camOn, micMuted}, ...]
- `mySocketId`: self identification
- `open`: bool
- `onClose()`: close handler

### Hooks: Detailed Design

#### **useMediaDevices.js**

Manages local camera/mic.

Exports:
```javascript
{
  camOn,           // bool: camera is on
  micMuted,        // bool: mic is muted (but still active)
  localStream,     // MediaStream from getUserMedia
  toggleCam,       // async () => void
  toggleMic,       // () => void
  speakingVolume   // 0-255, updated every 100ms
}
```

Implementation:
- `toggleCam()`: If ON, stop all tracks + set camOn=false. If OFF, call getUserMedia({video:true, audio:true}), set camOn=true, emit "cam-state" event
- `toggleMic()`: Toggle `localStream.getAudioTracks()[0].enabled`, toggle micMuted state, emit "mic-state" event
- `speakingVolume`: AudioContext + AnalyserNode on audio track, poll getByteFrequencyData every 100ms, return average

Cleanup: On unmount, stop all tracks and close AudioContext.

#### **useMediaConnections.js**

Manages peer connections for webcam/mic streams.

Exports:
```javascript
{
  remoteStreams   // Map<socketId, MediaStream>
}
```

Implementation:
- Maintains Map<socketId, {pc: RTCPeerConnection, senders: [RTCRtpSender]}>
- On localStream change (toggleCam): for each existing member, create media peer connection, add localStream tracks, emit media-offer
- On receiving media-offer: create peer, setRemoteDescription, create answer, ontrack → store remoteStreams[fromSocketId]
- On toggleCam OFF: close all peers, clear remoteStreams
- Server relays: media-offer, media-answer, media-ice (same as webrtc-offer etc)

Cleanup: On unmount, close all peer connections.

### Server: New Socket Handlers (server/index.js)

Add these to the io.on('connection') handler:

```javascript
socket.on('media-offer', data => {
  io.to(data.targetSocketId).emit('media-offer', { ...data, fromSocketId: socket.id });
});

socket.on('media-answer', data => {
  io.to(data.targetSocketId).emit('media-answer', { ...data, fromSocketId: socket.id });
});

socket.on('media-ice', data => {
  io.to(data.targetSocketId).emit('media-ice', { ...data, fromSocketId: socket.id });
});

socket.on('cam-state', data => {
  const roomId = data?.roomId || roomForSocket.get(socket.id);
  if (!roomId) return;
  socket.to(roomId).emit('cam-state', { socketId: socket.id, on: data.on });
});

socket.on('mic-state', data => {
  const roomId = data?.roomId || roomForSocket.get(socket.id);
  if (!roomId) return;
  socket.to(roomId).emit('mic-state', { socketId: socket.id, muted: data.muted });
});
```

### WebRTCManager: New Method

Add to client/src/webrtc.js:

```javascript
setQuality(quality, fps) {
  // Recapture at new fps
  this.localStream = this._capture(this.video, fps);
  
  const scaleMap = { '1080p': 1, '720p': 1.5, '480p': 2.25, '360p': 3 };
  const bitrateMap = { '1080p': 8000000, '720p': 4000000, '480p': 1500000, '360p': 800000 };
  const scale = scaleMap[quality] || 1;
  const bitrate = bitrateMap[quality] || 8000000;
  
  for (const [_, entry] of this.peers.entries()) {
    const sender = entry.senders.find(s => s.track && s.track.kind === 'video');
    if (!sender) continue;
    
    const params = sender.getParameters();
    if (params.encodings && params.encodings[0]) {
      params.encodings[0].scaleResolutionDownBy = scale;
      params.encodings[0].maxBitrate = bitrate;
    }
    sender.setParameters(params);
    sender.replaceTrack(this.localStream.getVideoTracks()[0]);
  }
}
```

### CSS Rewrite (App.module.css)

Complete rewrite for new layout: top bar, side panels, bottom toolbar, webcam strip.

Key classes:
- `.shell`: height 100dvh, flex column, overflow hidden
- `.topBar`: 48px, sticky top, flex row, gap 12px
- `.mainArea`: flex 1, flex column, overflow hidden
- `.videoWrapper`: flex 1, relative, video centered
- `.webcamStrip`: 140px height, overflow-x auto, flex row, gap 8px
- `.bottomToolbar`: 64px, flex row centered, gap 16px
- `.toolbarBtn`: 44x44px circle buttons, hover effect
- `.sidePanel`: position fixed right, width 320px, transform slide
- `.tile`: webcam tile, 160x120px, relative, border-radius 8px
- `.speaking`: box-shadow green pulse animation

Media queries for mobile: smaller toolbar, full-width panels, 80px webcam strip

---

## Summary of Implementation Status

| Phase | Feature | Status | Tested |
|-------|---------|--------|--------|
| 1 | Room creation/join | ✅ Complete | ✅ Manual |
| 1 | Playback sync | ✅ Complete | ✅ Manual |
| 1 | Chat | ✅ Complete | ✅ Manual |
| 1 | Host reassignment | ✅ Complete | ✅ Manual |
| 2 | Host video capture | ✅ Complete | ✅ Manual |
| 2 | WebRTC signaling | ✅ Complete | ✅ Manual |
| 2 | Viewer stream reception | ✅ Complete | ✅ Manual |
| 2 | Fallback (file upload) | ✅ Complete | ✅ Manual |
| 3 | Camera toggle | 🚧 In Progress | ⏳ Pending |
| 3 | Microphone toggle | 🚧 In Progress | ⏳ Pending |
| 3 | Custom ControlBar | 🚧 In Progress | ⏳ Pending |
| 3 | WebcamGrid | 🚧 In Progress | ⏳ Pending |
| 3 | Quality control | 🚧 In Progress | ⏳ Pending |
| 3 | Speaking detection | 🚧 In Progress | ⏳ Pending |

---

## Verification Checklist (Phase 3)

After implementation, manually verify:

### Controls

- [ ] 1. Host can play/pause → viewer reacts within 300ms
- [ ] 2. Host seeks → viewer jumps to same time
- [ ] 3. Skip -10, Skip +10 work and emit SEEK
- [ ] 4. Viewer control bar greyed out (no-click)
- [ ] 5. Volume slider works locally (no sync)
- [ ] 6. Quality dropdown changes bitrate (check Network tab)
- [ ] 7. Fullscreen works on desktop and mobile

### Webcam / Mic

- [ ] 8. Camera toggle: tile appears/disappears both sides
- [ ] 9. Mic toggle: muted indicator on remote tile
- [ ] 10. Self tile is mirrored (scaleX -1)
- [ ] 11. Speaking indicator glows green when talking
- [ ] 12. No audio echo (self video muted)

### Mobile

- [ ] 13. iPhone Safari: layout fits, no horizontal scroll
- [ ] 14. Bottom toolbar above iOS home bar
- [ ] 15. Touch targets ≥44px
- [ ] 16. Chat full-screen overlay on mobile
- [ ] 17. Seek bar draggable with finger

### Edge Cases

- [ ] 18. Join with camera on → remote tile appears immediately
- [ ] 19. Host leaves → "Host left" banner, remain

ing users' tiles stay
- [ ] 20. Refresh page → rejoin works, cam/mic state clean
- [ ] 21. Permission denied (camera) → graceful error, app still works

---

## Next Steps

1. Implement Phase 3 (this document)
2. Run verification checklist
3. Deploy to staging
4. Collect feedback on UX/performance
5. Phase 4: Screen sharing, recording, etc. (future)

