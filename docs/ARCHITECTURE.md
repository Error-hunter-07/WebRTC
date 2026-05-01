# Watch Together — Architecture & System Design

## High-Level Overview

Watch Together is a **real-time synchronized streaming and collaboration platform** built on three core technologies:

1. **Socket.IO** — Low-latency signaling for room management, playback sync, and media state
2. **WebRTC** — Peer-to-peer media transport (video/audio) with minimal latency
3. **React** — UI orchestration, component hierarchy, and hook-based state management

```
┌─────────────────────────────────────────────────────────────────┐
│                       Watch Together                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────┐      ┌───────────────────────────┐ │
│  │    Frontend (Client)     │      │   Backend (Server)         │ │
│  │  ┌─────────────────────┐ │      │ ┌─────────────────────────┐ │
│  │  │ React Components    │ │      │ │ Express + Socket.IO     │ │
│  │  │ • RoomScreen       │ │◄────►│ │ • Room Management       │ │
│  │  │ • VideoPlayer      │ │      │ │ • Signaling Relay       │ │
│  │  │ • WebcamGrid       │ │      │ │ • State Broadcast       │ │
│  │  │ • ControlBar       │ │      │ │                          │ │
│  │  └─────────────────────┘ │      │ └─────────────────────────┘ │
│  │                           │      │                             │
│  │  ┌─────────────────────┐ │      │                             │
│  │  │ Hooks               │ │      │                             │
│  │  │ • useMediaDevices   │ │      │                             │
│  │  │ • useMediaConn.     │ │      │                             │
│  │  │ • useSyncEngine     │ │      │                             │
│  │  └─────────────────────┘ │      │                             │
│  │                           │      │                             │
│  │  ┌─────────────────────┐ │      │                             │
│  │  │ Singletons          │ │      │                             │
│  │  │ • socket (Socket.IO)│ │      │                             │
│  │  │ • SyncEngine        │ │      │                             │
│  │  │ • WebRTCManager     │ │      │                             │
│  │  └─────────────────────┘ │      │                             │
│  └─────────────────────────────────────────────────────────────┘ │
│           │                                   │                 │
│           │ WebRTC (P2P Media)                │ Signaling       │
│           │ & Socket.IO (Messages)            │ (offer/answer)  │
│           └──────────────────────────────────┘                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Socket.IO Event Flow

### 1. Room Lifecycle

```
CLIENT A (Host)                 SERVER                CLIENT B (Viewer)
    │                              │                         │
    │──── create-room ────────────►│                         │
    │      {username}              │                         │
    │                     [Create room ABC in memory]       │
    │◄─────── room-joined ─────────│                         │
    │        {roomId, members}     │                         │
    │                              │                         │
    │                              │ [B connects]            │
    │                              │◄─── join-room ─────────│
    │                              │     {roomId, user}     │
    │                              │                         │
    │◄─────── user-joined ─────────┤────────────────────────►│
    │      {socketId, member list}     {roomId, members}    │
    │                              │────── room-joined ────►│
    │                              │   {roomId, members}    │
    │
```

### 2. Playback Sync (Phase 1)

```
CLIENT A (Host)                 SERVER                CLIENT B (Viewer)
    │ [Play button clicked]       │                         │
    │      (SyncEngine emits)     │                         │
    │──── sync-event ────────────►│                         │
    │     {type: PLAY, time: 0}  │                         │
    │                      [Relay to room]                  │
    │                             │───── sync-event ───────►│
    │                             │   {type: PLAY, time: 0}│
    │                             │  (SyncEngine applies)   │
    │                             │   video.play()          │
    │                             │                         │
    │ [Every 3 seconds]           │                         │
    │──── heartbeat ─────────────►│  [Adjust for drift]     │
    │    {time: 15.2, roomId}    │                         │
    │                             │───── heartbeat ────────►│
    │                             │   {time: 15.2}         │
    │                             │ if |diff| > 0.5s:     │
    │                             │   video.currentTime = 15.2│
```

### 3. WebRTC Stream Setup (Phase 2)

```
HOST (has video file)           SERVER              VIEWER (no file)
    │                              │                     │
    │ [Load file + metadata load]  │                     │
    │ (WebRTCManager.initHost)    │                     │
    │──── host-loaded-video ─────►│                     │
    │                              │─────────────────────►│
    │                              │ {host loaded}        │
    │                    (Viewer receives signal)        │
    │                              │                     │
    │                              │◄─── request-stream ──│
    │◄───── viewer-wants-stream ───│                     │
    │ {viewerSocketId}             │                     │
    │ [Create RTCPeerConnection    │                     │
    │  add tracks] ────────────────►                     │
    │                              │────► webrtc-offer ──►│
    │                              │      {offer, SDP}    │
    │                              │                     │
    │                              │◄─────webrtc-answer ──│
    │◄───── webrtc-answer ─────────│      {answer}        │
    │                              │                     │
    │──── webrtc-ice ────────────►│──── webrtc-ice ─────►│
    │     [Candidates...]               [Multiple]       │
    │                              │                     │
    │ [Connection established]     │ [Connection est.]   │
    │ [Stream flow starts]         │ [ontrack fires]     │
    │                              │ video.srcObject = stream
    │                              │ [Video plays]       │
```

### 4. Webcam/Mic Signaling (Phase 3)

```
PARTICIPANT A                  SERVER            PARTICIPANT B
    │ [Click camera button]      │                    │
    │ [getUserMedia()]           │                    │
    │──── cam-state ────────────►│                    │
    │     {on: true, roomId}    │                    │
    │                            │──── cam-state ────►│
    │ [Create media peer conn]   │     {on: true}     │
    │──── media-offer ──────────►│                    │
    │     {offer, SDP}           │──── media-offer ───►│
    │                            │                    │
    │                            │◄─── media-answer ───│
    │◄───── media-answer ────────│                    │
    │                            │                    │
    │ [ICE candidates...]        │                    │
    │──── media-ice ────────────►│──── media-ice ────►│
    │                            │                    │
    │ [Stream received]          │ [Stream from A]    │
    │ [Remote tile rendered]     │ [Tile shows A]     │
```

---

## Component Hierarchy

```
App
├── LobbyScreen
│   ├── Username input
│   ├── Create Room button
│   └── Join Room (input + button)
│
└── RoomScreen
    ├── TopBar
    │   ├── Room ID + Copy button
    │   ├── Status (Streaming/Waiting/Syncing)
    │   └── Drift indicator
    │
    ├── MainArea
    │   ├── VideoWrapper
    │   │   ├── VideoPlayer
    │   │   │   ├── <video> element
    │   │   │   └── ControlBar
    │   │   │       ├── Skip -10s button
    │   │   │       ├── Play/Pause (host only)
    │   │   │       ├── Skip +10s button
    │   │   │       ├── Time display
    │   │   │       ├── Seek slider
    │   │   │       ├── Volume slider
    │   │   │       ├── Mute button
    │   │   │       ├── Quality dropdown (host active)
    │   │   │       ├── FPS dropdown
    │   │   │       └── Fullscreen button
    │   │   │
    │   │   └── WebcamStrip (Phase 3)
    │   │       └── WebcamGrid
    │   │           └── Participant tiles
    │   │               ├── Video (if cam on)
    │   │               ├── Avatar (if cam off)
    │   │               ├── Mic mute indicator
    │   │               ├── Speaking volume glow
    │   │               └── Name label
    │   └── BottomToolbar
    │       ├── Mic button
    │       ├── Cam button
    │       ├── Play/Pause (host)
    │       ├── Chat button + badge
    │       ├── People button + badge
    │       └── Leave button
    │
    ├── ChatPanel (side panel)
    │   ├── Message list
    │   └── Message input
    │
    └── PeoplePanel (side panel)
        └── Members list (with cam/mic state)
```

---

## Data Flow Diagrams

### Playback Sync Detail (Phase 1)

```
Host Video Element
    │
    │ [play/pause/seeked events]
    │
    ▼
SyncEngine (isHost=true)
    │ [Intercepts events]
    │ [Suppresses echo during apply-remote]
    │
    ├──► socket.emit('sync-event', {type, time})
    │
    ├──► socket.emit('heartbeat', {time}) every 3s
    │
    ▼
Server (Socket.IO)
    │ [Relay to room members]
    │
    ├──► socket.to(roomId).emit('sync-event', ...)
    │
    ├──► socket.to(roomId).emit('heartbeat', ...)
    │
    ▼
Remote Video Element
    │
    ├─► SyncEngine (isHost=false)
    │   [onSyncEvent: set currentTime + play/pause]
    │   [onHeartbeat: drift correction if |diff| > 0.5s]
    │   [isSyncing flag prevents echo]
    │
    └─► Viewer sees same timestamp ±0.5s
```

### Webcam Stream with Speaking Detection (Phase 3)

```
Local Media Device
    │
    ├─► getUserMedia({video, audio})
    │
    ▼
useMediaDevices Hook
    │
    ├─► localStream (stored)
    │
    ├─► AudioContext + AnalyserNode
    │   [Poll every 100ms]
    │   [getByteFrequencyData]
    │   [Calculate average → speakingVolume]
    │
    ▼
useMediaConnections Hook
    │
    ├─► Create media RTCPeerConnection per participant
    │
    ├─► Add localStream tracks
    │
    ├─► Emit media-offer via server
    │
    ▼
Remote Participant
    │
    ├─► Receive media-answer
    │
    ├─► ontrack event fires
    │   [Add remote stream to state]
    │
    ▼
WebcamGrid Component
    │
    ├─► self tile: localStream + speaking glow
    │
    ├─► remote tile: remoteStreams[socketId]
    │
    └─► Display cam on/off, mic muted, speaking indicator
```

---

## State Management

### Global Singletons (Never Unmount)

| Singleton | Lifetime | Purpose |
|-----------|----------|---------|
| `socket` (socket.js) | App lifetime | Real-time signaling |
| `SyncEngine` | Per room | Playback sync |
| `WebRTCManager` | Per room | Video stream P2P |

### Component State (Remounted on Room Leave)

| Hook | Scope | Resets On |
|------|-------|-----------|
| `useMediaDevices` | App-wide | Component unmount or explicit toggle |
| `useMediaConnections` | Per room | Left room or reconnect |
| RoomScreen state | Per room | Room change or disconnect |

### Example: Room State Lifecycle

```javascript
// App.jsx
const [joined, setJoined] = useState(false);
const [roomId, setRoomId] = useState('');

// Create room
const handleCreateRoom = (username) => {
  socket.emit('create-room', { username }, (res) => {
    if (res.ok) {
      setRoomId(res.roomId);       // ← Triggers RoomScreen mount
      setJoined(true);
      // SyncEngine + WebRTCManager created in RoomScreen.useEffect
    }
  });
};

// Leave room
const handleLeaveRoom = () => {
  socket.disconnect();             // ← Triggers RoomScreen unmount
  setJoined(false);                // ← Cleanup media connections
  setRoomId('');
};
```

---

## WebRTC Peer Connection Topology

### Phase 2: Video Stream (Mesh from Host → Viewers)

```
                    ┌─────────────────────────┐
                    │    Host WebRTC          │
                    │  (captures video)       │
                    │                         │
                    │  peers = {              │
                    │    viewerA_id: PeerConn │
                    │    viewerB_id: PeerConn │
                    │    viewerC_id: PeerConn │
                    │  }                      │
                    └────────┬────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Viewer A │   │ Viewer B │   │ Viewer C │
        │ PeerConn │   │ PeerConn │   │ PeerConn │
        │(receive) │   │(receive) │   │(receive) │
        └──────────┘   └──────────┘   └──────────┘
             │              │              │
             ▼              ▼              ▼
        video element   video element   video element
```

### Phase 3: Webcam/Mic (Mesh P2P All-to-All)

```
        ┌─────────────────┐
        │  Participant A  │
        │  peers = {      │
        │    B: Peer,     │
        │    C: Peer      │
        │  }              │
        └────────┬────────┘
                 │
        ┌────────┴─────────┐
        │                  │
        ▼                  ▼
    (to B)            (to C)
     [offer]          [offer]
        │                  │
        │  ┌───────────────┘
        │  │
        ▼  ▼
    ┌─────────────┐         ┌─────────────┐
    │Participant B│◄───┐    │Participant C│
    │ peers = {   │    │    │ peers = {   │
    │   A: Peer,  │    │    │   A: Peer,  │
    │   C: Peer   │    │    │   B: Peer   │
    │ }           │    │    │ }           │
    └──────┬──────┘    │    └──────┬──────┘
           │           │           │
           ├───────────┘           │
           │ (offers to A,C)       │
           │                       │
           └───────────────────────┘

[Full mesh: every participant has a peer connection to every other]
[Warning: doesn't scale beyond ~6 participants; bandwidth O(n²)]
```

---

## Quality & FPS Control (Phase 3)

When user changes Quality dropdown to "480p" and FPS to "30":

```
ControlBar.jsx
    │
    │ onQualityChange('480p', 30)
    │
    ▼
RoomScreen.jsx
    │
    │ webrtcManager.setQuality('480p', 30)
    │
    ▼
webrtc.js: setQuality(quality, fps)
    │
    ├─► Re-capture stream: this.localStream = this.video.captureStream(fps)
    │   (New fps parameter)
    │
    ├─► For each peer in this.peers:
    │   │
    │   ├─► Get video sender: sender = senders.find(s => s.track.kind === 'video')
    │   │
    │   ├─► Get params: params = sender.getParameters()
    │   │
    │   ├─► Modify scaleResolutionDownBy:
    │   │   480p: 2.25 (1080/480)
    │   │
    │   ├─► Modify maxBitrate:
    │   │   480p: 1500000 bps
    │   │
    │   ├─► Apply: sender.setParameters(params)
    │   │
    │   └─► Replace track: sender.replaceTrack(newVideoTrack)
    │
    ▼
WebRTC Encoder
    │
    └─► Encodes at 480p, 30fps, 1.5 Mbps max
        Network traffic reduced by ~70% vs 1080p60fps
```

---

## Security & Privacy Considerations

### Data in Transit
- **Socket.IO:** TLS/SSL in production (via HTTPS domain)
- **WebRTC:** DTLS-SRTP encryption (browser-automatic)
- Room IDs: 6-char hex, not guessable; could add password in future

### Permissions
- **Camera/Mic:** Browser prompts user; app doesn't store, passes through
- **Room Access:** No authentication; open to anyone knowing room ID (mitigate with password in future)

### No Data Storage
- No database; state is in-memory on server
- Rooms deleted when last member leaves
- No video/audio recording

---

## Error Handling Strategy

| Failure Point | Handling |
|---------------|----------|
| Camera permission denied | Alert user, disable camera button, rest works |
| WebRTC connection failed | Fallback: viewer can manually load file (Phase 1 mode) |
| Socket.IO disconnect | "Disconnected" status, auto-reconnect on socket.io client config |
| Stream metadata won't load | Show error banner, keep trying |
| Room full (>4 viewers) | "Room full" error on join attempt |
| Host leaves mid-stream | "Host left. Waiting..." banner, reassign host to next member |

---

## Performance Optimizations

### Rendering
- `React.memo` on WebcamGrid tiles to prevent re-renders on every heartbeat
- Drift indicator updates only on heartbeat (not every frame)
- Seek bar uses `requestAnimationFrame` instead of `setInterval` for smooth 60fps

### Network
- Heartbeat only every 3 seconds (not every frame)
- Quality/FPS control scales bitrate 8 Mbps → 500 kbps
- ICE gathering limits to reduce SDP size

### Audio
- Speaking detection: 100ms polling (not continuous analysis)
- Audio context resampled to 8 kHz for analysis-only (not transmitted)

---

## Testing Checklist

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for Phase 3 verification steps.

