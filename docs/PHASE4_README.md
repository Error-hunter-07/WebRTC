# Phase 4 — UI Overhaul, Bug Fixes & Feature Completion

> **Reference document for all changes, additions, and the GitHub Copilot implementation prompt.**
> Files that must NOT be touched: `sync.js`, `socket.js`, `webrtc.js` (except `setQuality` which already exists).

---

## Part 1 — Runtime Errors & Bugs Found

### 1.1 `ChatPanel.jsx` — `React` is used but never imported
```jsx
// Line 1: uses React.useState, React.useEffect, React.useRef
// BUT: no import at top — will crash at runtime
```
**Fix:** Add `import React, { useState, useEffect, useRef } from 'react';` at the top.  
Same issue exists in `LobbyScreen.jsx`, `PeoplePanel.jsx`, and `ControlBar.jsx` — they all use `React.useState` etc. without importing React. The `import React from 'react'` at the bottom of these files is after the component export, meaning it's a dead import placed incorrectly.

---

### 1.2 `ChatPanel.jsx` — renders `m.message` but server sends `m.text`
In `App.jsx`, the `onChat` handler stores `data.text` into the messages array:
```js
{ ..., text: data.text, ts: data.ts }
```
But `ChatPanel.jsx` renders `{m.message}` — so chat messages always appear blank.  
**Fix:** Change `{m.message}` to `{m.text}` in ChatPanel.

---

### 1.3 `App.jsx` — `onLeaveRoom` calls `socket.emit('disconnect')` — WRONG
`socket.emit('disconnect')` sends a custom event named "disconnect" to the server, but the server only listens for the actual socket disconnection via `socket.on('disconnect', ...)`. This means leaving a room does NOT actually remove the user from the server's room state.  
**Fix:** Call `socket.disconnect()` (the Socket.IO method) followed by `socket.connect()` to reconnect for the next session. Or emit a custom `'leave-room'` event that the server handles explicitly.

---

### 1.4 `ControlBar.jsx` — play/pause icon is stale (never re-renders)
```jsx
{barBtns(videoRef.current?.paused ? 'Play' : 'Pause', togglePlay, videoRef.current?.paused ? InlineIcons.play : InlineIcons.pause)}
```
`videoRef.current?.paused` is read during render but is not reactive state — the component will not re-render when the video plays/pauses triggered externally (by sync events). The icon will be permanently wrong.  
**Fix:** Add a `playing` state: listen to `play` and `pause` events on the video element and update state.

---

### 1.5 `ControlBar.jsx` — `setInterval` used instead of `requestAnimationFrame`
```js
const rafId = setInterval(update, 100);
```
Comment in Phase 3 doc said to use `requestAnimationFrame`. `setInterval` at 100ms is coarse and wastes CPU. Also the variable is named `rafId` but is actually an interval ID — misleading.  
**Fix:** Replace with a `requestAnimationFrame` loop that only runs when the video is playing.

---

### 1.6 `useMediaDevices.js` — `AudioContext` recreated on every `localStream` change
```js
if (!audioCtxRef.current) {
  audioCtxRef.current = new (window.AudioContext ...)()
```
This only checks if `audioCtxRef` is null, but doesn't reconnect to the new stream when `localStream` changes. If the user toggles cam (which changes `localStream`), the analyser still points at the old stream.  
**Fix:** Close and recreate `AudioContext` on `localStream` change, or reconnect the source node.

---

### 1.7 `useMediaConnections.js` — offers are fired every time `members` array reference changes
```js
useEffect(() => {
  // calls pc.createOffer() for all members
}, [socket, roomId, members, localStream, mySocketId]);
```
`members` is an array stored in React state. Any `setMembers(...)` call (including when someone joins, leaves, or `user-joined` fires) creates a new array reference, causing this effect to re-run and attempt new offers on all existing connections — leading to `InvalidStateError: Cannot create offer in state stable`.  
**Fix:** Use a `useRef` to track which peers have already been offered. Only offer to members not already in `peersRef.current`.

---

### 1.8 `RoomScreen.jsx` — unread message counter increments for own messages
```js
React.useEffect(() => {
  if (!chatOpen && messages.length > 0) setUnreadChat(c => c + 1);
}, [messages, chatOpen]);
```
This increments on every message including the ones you send yourself.  
**Fix:** Only increment if the last message's `socketId` is not your own socket ID.

---

### 1.9 `VideoPlayer.jsx` — stray `import React from 'react'` after the export
Last line of `VideoPlayer.jsx` has `import React from 'react';` placed AFTER the export. This is syntactically invalid in ES modules — imports must be at the top.

---

### 1.10 `WebcamGrid.jsx` — class names used don't match CSS
Component uses: `styles.tile`, `styles.self`, `styles.speaking`, `styles.tileVideo`, `styles.placeholder`, `styles.micOff`, `styles.badge`, `styles.label`  
CSS defines: `.tile`, `.self`, `.speaking`, `.tileVideo`, `.placeholder`, `.micOff`, `.badge`, `.label` — these match.  
BUT `WebcamGrid` also references `styles.hidden` for the audio element, which exists in CSS. **OK.**  
However, `RoomScreen.jsx` renders `<ToolbarIcon>` with `danger` prop but the CSS class is `.danger`, while the logic applies `styles.danger` only when `danger` prop is truthy. The `.toolbarBtn.inactive` class exists in CSS but is never applied anywhere. **Dead CSS.**

---

### 1.11 `App.jsx` — `debugOpen` state is never toggled back in new code path
The `keydownListener` is set up inside `useEffect` that depends on `[joined, roomId, isHost]`, but `debugOpen` state is read inside a `setInterval` callback that captures the stale closure value from when the effect ran. `debugOpen` changes don't re-run the effect, so `collectStats()` is never actually called.  
**Fix:** Use `debugOpen` via a ref inside the interval, or split the debug interval into its own `useEffect([debugOpen])`.

---

## Part 2 — Unprofessional / Low Quality Issues

### 2.1 Emoji icons in toolbar — unacceptable for a production app
```jsx
<ToolbarIcon icon="🎤" ... />
<ToolbarIcon icon="📹" ... />
<ToolbarIcon icon="▶" ... />
<ToolbarIcon icon="💬" ... />
<ToolbarIcon icon="👥" ... />
<ToolbarIcon icon="📴" ... />
```
Emoji render differently across every OS, browser, and font. On some Android devices `📴` is a broken box. On Windows it renders as flat color. This looks like a prototype, not a product. Every major video app (Zoom, Meet, Teams) uses consistent SVG icons.

---

### 2.2 Control bar skip buttons use emoji too
```jsx
{barBtns('Back 10s', () => skip(-1), '⏪')}
{barBtns('Forward 10s', () => skip(1), '⏩')}
```
Same issue. Need proper SVG icons.

---

### 2.3 Lobby has no visual identity
The lobby card is a plain column of inputs with a gradient background. No logo, no icon, no product personality. The copy is just "Real-time synchronized video watching with WebRTC." — developer-speak, not user-facing text.

---

### 2.4 File input is a raw `<input type="file">` with no styling
```jsx
<input type="file" accept="video/*" onChange={...} />
```
The browser's native file input looks completely different on every platform and cannot be styled directly. It looks broken in the overall dark UI. Needs a proper custom upload button with drag-and-drop.

---

### 2.5 Chat messages have no visual differentiation
Own messages vs others' messages look identical. No timestamps. No bubble layout. No "today" separators. No empty state. Looks like a log file, not a chat.

---

### 2.6 People panel shows media state as text `[cam off] [muted]`
```jsx
{mediaStates[m.socketId]?.camOn === false && ' [cam off]'}
{mediaStates[m.socketId]?.micMuted === true && ' [muted]'}
```
Bracket text is never acceptable in a UI. Needs icons.

---

### 2.7 Color palette is flat and generic
Background `#1a1a1a`, borders `#333`, accents `#3b82f6` (default Tailwind blue). This is the default dark UI that every developer builds on day one. No visual identity, no creativity.

---

### 2.8 No loading states anywhere
When creating/joining a room — no spinner, no feedback. When connecting to stream — the hint text is just a `<p>`. No animated states, no skeleton.

---

### 2.9 Mobile: seek bar and time display are hidden with `display: none`
```css
@media (max-width: 600px) {
  .timeDisplay, .seekSlider { display: none; }
}
```
Hiding the seek bar on mobile makes the app completely unusable on phones for the host. This should be redesigned, not hidden.

---

### 2.10 `controlBarWrap` sits OUTSIDE the video element
Looking at the structure in `VideoPlayer.jsx`:
```jsx
<div className={styles.videoWrapper}>
  <video ... />
  <div className={styles.controlBarWrap}>   ← inside wrapper, good
    <ControlBar ... />
  </div>
</div>
```
But the CSS for `.controlBarWrap` has no `position: absolute` — it just sits below the video as a block element, taking up layout space rather than overlaying the video. On mobile this pushes the video up.  
**Fix:** Make `controlBarWrap` position absolute, pinned to the bottom of `videoWrapper`.

---

## Part 3 — UI Changes & Additions (Phase 4 Scope)

### 3.1 Design Direction
**Aesthetic: Premium Dark Cinema**
- Font: `DM Sans` (display/UI) + `JetBrains Mono` (room codes, time display)
- Color palette: Deep near-black `#080C14` base. Accent: electric cyan `#06B6D4` (not Tailwind blue). Secondary glow: amber `#F59E0B` for host-only actions.
- Glass panels with genuine blur and border-glow, not flat dark boxes.
- Subtle noise texture overlay on background for depth.
- Smooth animations: 200ms ease-out for all transitions. Spring animations for panels.

---

### 3.2 Icons — Replace ALL emoji with Lucide SVG icons (inline, no library)
Use inline SVG paths from Lucide (MIT license). These are the industry standard icons used by Vercel, Linear, Figma etc.

| Element | Lucide Icon Name | SVG path to use |
|---|---|---|
| Mic on | `mic` | M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v3 M8 22h8 |
| Mic off | `mic-off` | M2 2l20 20 M18.89 13.23A7.12 7.12 0 0 0 19 12v-2 M5 10v2a7 7 0 0 0 14 0v-2... (use full path) |
| Camera on | `video` | M23 7l-7 5 7 5V7z M1 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5z |
| Camera off | `video-off` | Use the full Lucide video-off path |
| Chat | `message-circle` | M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z |
| People | `users` | M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75 M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0 |
| Leave | `phone-off` | Use Lucide phone-off path |
| Play | `play` | M5 3l14 9-14 9V3z |
| Pause | `pause` | M6 4h4v16H6z M14 4h4v16h-4z |
| Skip back | `skip-back` | Custom: rewind-10 icon — circle with "10" and back arrow |
| Skip forward | `skip-forward` | Custom: forward-10 icon |
| Volume | `volume-2` | M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 0 1 0 14.14 M15.54 8.46a5 5 0 0 1 0 7.07 |
| Mute | `volume-x` | M11 5L6 9H2v6h4l5 4V5z M23 9l-6 6 M17 9l6 6 |
| Fullscreen | `maximize-2` | M15 3h6v6 M9 21H3v-6 M21 3l-7 7 M3 21l7-7 |
| Settings/Quality | `settings-2` | Use Lucide settings-2 |
| Copy | `copy` | M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1 |
| Check (copied) | `check` | M20 6L9 17l-5-5 |
| Close/X | `x` | M18 6L6 18 M6 6l12 12 |
| Host crown | `crown` | M2 20h20 M5 20V10l7-7 7 7v10 |

Create a single file: `client/src/components/Icons.jsx` that exports all icons as React components.

---

### 3.3 Lobby Screen — Full Redesign

**Layout:** Full-viewport centered. Animated gradient background with floating particles (CSS only — using pseudo-elements and keyframe animations). The card appears with a fade-up animation on load.

**Card contents:**
- Top: Film icon + "CineSync" logotype (or whatever the app is named). Sub-line: "Watch together, perfectly in sync."
- Username input with animated floating label
- Two clear CTA sections separated by a stylized divider:
  - **"Host a Session"** — large primary button with cyan gradient, film reel icon
  - **"Join a Session"** — Room code input (monospace font, uppercase auto-transform) + Join button
- Error state: red inline text below the relevant section, not a generic `<p>`
- A small footer line: "No account needed · Streams directly between devices"

---

### 3.4 Top Bar — Redesign

**Current:** Two divs with raw text.

**New:**
- Left: small app icon/logo + Room code in a pill chip (monospace, click to copy, subtle glow on hover)
- Center: stream status with animated dot (green pulsing dot for "In sync", yellow for "Syncing...", grey for disconnected)
- Right: member count pill (avatar circles stacked for up to 3 members, "+N" for more) + slim leave button

---

### 3.5 Video Area — Redesign

**Control bar must overlay the video** (position absolute over video, not below it):
- Appear on hover (desktop) / always visible (mobile)
- Gradient overlay from bottom: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)`
- On mobile: always visible, thicker touch targets

**Control bar layout (revised for mobile):**
- Full-width seek bar at the very top of the control bar area (full width, 6px height, 16px thumb on mobile)
- Below: left group | center group | right group
  - Left: Skip-10 | Play/Pause | Skip+10 | Time display (hidden below 400px, shown above)
  - Center: (empty on mobile, quality badge on desktop)
  - Right: Volume | Quality dropdown | Fullscreen
- All controls visible on mobile — no `display: none`
- On screens < 480px: single row, icons only (no text), larger hit area

**File upload (host only):**
- Replace raw file input with a styled drag-and-drop zone
- Shows: upload cloud icon + "Drop a video file here or tap to browse"
- On drag-over: glowing border animation
- On mobile: simple large button "Select Video File" that triggers file picker
- Once loaded: show file name + duration, replace with "Change File" small link

---

### 3.6 Webcam Strip — Redesign

**Current:** Basic flex row with 160x120 tiles.

**New:**
- Tiles have rounded corners (12px), subtle drop shadow
- Speaking indicator: animated green border pulse (CSS keyframe, not just border-color change)
- Avatar (when cam off): first letter initial on a gradient background. Each user gets a deterministic gradient from their username (hash the string, pick from a palette of 8 gradients)
- Host tile: subtle crown icon badge in top-left corner
- Self tile: "You" label + mirrored video
- Muted indicator: proper SVG mic-off icon in bottom-right of tile, not emoji
- On mobile: tiles are smaller (80x60) and the strip is collapsible (tap to expand/collapse with animation)
- Empty state: when no one has camera on, the strip shows a single dimmed message "No cameras on" and collapses to 48px height

---

### 3.7 Bottom Toolbar — Redesign

**Current:** Centered flex row of round buttons with emoji.

**New:**
- Three groups: Media (mic, cam) | Actions (play/pause for host) | Navigation (chat, people, leave)
- Subtle separator between groups (1px vertical line)
- Mic OFF state: button turns red with a diagonal slash animation over the icon
- Cam OFF state: button turns red
- Host play/pause: larger button (52px) with amber/gold accent color to visually distinguish it as the "authoritative control"
- Badge on chat button: red dot (not number) when there are unread messages
- Leave button: rightmost, separated, red — with a tooltip "Leave room" on hover
- On mobile: `justify-content: space-around`, icons are 48px, no labels

---

### 3.8 Chat Panel — Redesign

**Current:** Plain list of "username: message" text.

**New:**
- Own messages: right-aligned bubble (cyan-tinted background)
- Others' messages: left-aligned bubble (dark card background), username above in accent color
- Timestamps: shown on hover as tooltip
- "Today" date separator if messages span multiple sessions
- Empty state: center-aligned icon + "No messages yet. Say hello 👋"
- Message input: bottom of panel, rounded pill shape, send icon button inside the input (not a separate button), send on Enter
- Smooth scroll animation to bottom on new message
- Header: "Chat" title + unread count badge + X close button (proper SVG X icon)

---

### 3.9 People Panel — Redesign

**Current:** Plain `<ul>` list with `[cam off]` text.

**New:**
- Each member is a row: Avatar (initial letter with deterministic gradient matching their webcam tile) + Name + Role badge (HOST in amber, YOU in blue) + Media status icons (mic SVG icon with red slash if muted, camera SVG icon with red slash if cam off)
- Rows have subtle hover state
- Host row has a faint glow treatment
- Connection quality indicator (optional future feature placeholder — show as grey dots for now)

---

### 3.10 New: Toast Notification System
Replace all bare `alert()` calls and error banners with a toast system.

- A `<ToastContainer>` component fixed to top-right (desktop) or bottom (mobile)
- Toast types: `success` (green), `error` (red), `info` (blue), `warning` (amber)
- Auto-dismiss after 4 seconds, with progress bar animation
- Stack up to 3 toasts
- Use cases:
  - Camera permission denied → error toast
  - Mic permission denied → error toast
  - Room copied → success toast "Room code copied!"
  - Host left → info toast "Host disconnected. Reassigning..."
  - Stream connected → success toast "Stream connected ✓"

---

### 3.11 New: Video Status Overlay
Inside the video area (not in the control bar), a subtle centered overlay for loading states:

- "Waiting for host to load a video..." → spinner + text
- "Connecting to stream..." → animated dots
- "Stream connected" → fades out after 2 seconds
- These overlay the black video background, not the video itself

---

### 3.12 CSS Variables (Design Token System)
Replace all hardcoded colors in the CSS with variables defined in `:root`:

```css
:root {
  --bg-base: #080C14;
  --bg-surface: #0F1623;
  --bg-elevated: #161F2E;
  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --accent-primary: #06B6D4;      /* cyan */
  --accent-host: #F59E0B;          /* amber — host actions only */
  --accent-danger: #EF4444;        /* red — muted/cam off/leave */
  --accent-success: #22C55E;       /* green — speaking/in sync */
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 999px;
  --shadow-glow-cyan: 0 0 20px rgba(6,182,212,0.25);
  --shadow-glow-amber: 0 0 20px rgba(245,158,11,0.25);
  --font-ui: 'DM Sans', ui-sans-serif, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

---

### 3.13 Google Fonts Import
Add to `index.html`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## Part 4 — GitHub Copilot Prompt (Phase 4)

Paste this in full into GitHub Copilot Chat. It is split into numbered tasks. Do them in order.

---

```
WATCH TOGETHER APP — PHASE 4 IMPLEMENTATION

You are working on a WebRTC "Watch Together" app. Phase 1 (sync), Phase 2 (streaming), and Phase 3 (webcam/mic/component split) are complete. You must now implement Phase 4: UI overhaul, bug fixes, professional icons, and mobile optimization.

═══════════════════════════════════════════════════════════
STRICT RULES — READ BEFORE ANYTHING ELSE
═══════════════════════════════════════════════════════════
1. DO NOT modify: sync.js, socket.js, webrtc.js (zero changes)
2. DO NOT add any external UI libraries (no MUI, Radix, shadcn, Chakra)
3. DO NOT add Tailwind
4. DO NOT add TypeScript
5. All icons must be inline SVG in JSX — no icon libraries, no emoji
6. CSS Modules only (App.module.css) — no inline style objects except for dynamic values
7. React hooks only (useState, useEffect, useRef, useCallback, useMemo)
8. Keep all existing socket event names unchanged
9. Keep all existing prop interfaces between App.jsx and child components — only add new props, never remove existing ones

═══════════════════════════════════════════════════════════
TASK 1 — Fix all runtime bugs (do this first, verify nothing breaks)
═══════════════════════════════════════════════════════════

1a. In ChatPanel.jsx, LobbyScreen.jsx, PeoplePanel.jsx, ControlBar.jsx:
    - Move all React imports to the TOP of the file: `import React, { useState, useEffect, useRef } from 'react';`
    - Remove any `import React from 'react'` that appears AFTER the export statement
    - Use named destructured imports (useState, useEffect, etc.) instead of React.useState

1b. In ChatPanel.jsx, change `{m.message}` to `{m.text}` in the message render.

1c. In App.jsx, in onLeaveRoom():
    - Replace `socket.emit('disconnect')` with `socket.disconnect()`
    - After state resets, call `setTimeout(() => socket.connect(), 100)` so the socket reconnects for future use

1d. In ControlBar.jsx, add playing state:
    ```jsx
    const [playing, setPlaying] = useState(false);
    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      const onPlay = () => setPlaying(true);
      const onPause = () => setPlaying(false);
      v.addEventListener('play', onPlay);
      v.addEventListener('pause', onPause);
      return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); };
    }, [videoRef]);
    ```
    Use `playing` state (not `videoRef.current?.paused`) for the play/pause icon and tooltip.

1e. In ControlBar.jsx, replace setInterval with requestAnimationFrame:
    ```jsx
    const rafRef = useRef(null);
    useEffect(() => {
      const v = videoRef.current;
      if (!v) return;
      const tick = () => {
        setCurrentTime(v.currentTime || 0);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      const onLoaded = () => setDuration(v.duration || 0);
      v.addEventListener('loadedmetadata', onLoaded);
      return () => {
        cancelAnimationFrame(rafRef.current);
        v.removeEventListener('loadedmetadata', onLoaded);
      };
    }, [videoRef]);
    ```

1f. In App.jsx, fix the debug interval:
    ```jsx
    const debugOpenRef = useRef(false);
    // Update it when state changes:
    useEffect(() => { debugOpenRef.current = debugOpen; }, [debugOpen]);
    // Inside the setInterval callback, read debugOpenRef.current instead of debugOpen
    ```

1g. In useMediaConnections.js, add an `offeredPeers` ref to prevent duplicate offers:
    ```js
    const offeredPeers = useRef(new Set());
    // In the members useEffect, add check:
    if (offeredPeers.current.has(m.socketId)) return;
    offeredPeers.current.add(m.socketId);
    // Clear on cleanup
    ```

1h. In RoomScreen.jsx, fix unread count — only increment when the last message is NOT from self:
    ```jsx
    useEffect(() => {
      if (!chatOpen && messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last?.socketId !== mySocketId) setUnreadChat(c => c + 1);
      }
    }, [messages]);
    ```

═══════════════════════════════════════════════════════════
TASK 2 — Create Icons.jsx with all SVG icons
═══════════════════════════════════════════════════════════

Create file: `client/src/components/Icons.jsx`

Each icon is a functional component: `({ size = 20, color = 'currentColor', ...props }) => <svg ...>`
All SVGs must use: `width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"`

Export these named components:
- `IconMic` — path: "M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" plus "M19 10v2a7 7 0 0 1-14 0v-2" plus line "M12 19v3" plus line "M8 22h8"
- `IconMicOff` — Mic with diagonal line through it: combine mic paths with a line from (2,2) to (22,22)
- `IconCamera` — "M23 7l-7 5 7 5V7z" + rect "M1 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5z"
- `IconCameraOff` — Camera with diagonal slash: combine with line (1,1)-(23,23)
- `IconMessageCircle` — "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
- `IconUsers` — "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" + "M23 21v-2a4 4 0 0 0-3-3.87" + "M16 3.13a4 4 0 0 1 0 7.75" + circle cx9 cy7 r4
- `IconPhoneOff` — "M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-3.27m-2.28-6.2A19.79 19.79 0 0 1 2 4.14 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91" + line "M23 1 1 23"
- `IconPlay` — polygon "5 3 19 12 5 21 5 3"
- `IconPause` — two rects: x4 y4 w4 h16 and x16 y4 w4 h16
- `IconSkipBack10` — Custom: circle outline + text "10" + left-pointing arc arrow. Implement as: circle cx12 cy12 r10, then a curved arrow path pointing left at top, text element "10" centered at 12,14 with fontSize 8 fill={color} stroke="none"
- `IconSkipForward10` — Same but arrow pointing right
- `IconVolume2` — "M11 5L6 9H2v6h4l5 4V5z" + "M19.07 4.93a10 10 0 0 1 0 14.14" + "M15.54 8.46a5 5 0 0 1 0 7.07"
- `IconVolumeX` — "M11 5L6 9H2v6h4l5 4V5z" + line "M23 9l-6 6" + line "M17 9l6 6"
- `IconMaximize` — "M15 3h6v6" + "M9 21H3v-6" + "M21 3l-7 7" + "M3 21l7-7"
- `IconMinimize` — reverse of maximize
- `IconSettings` — circle cx12 cy12 r3 + the gear outer path
- `IconCopy` — two overlapping rects with rounded corners
- `IconCheck` — "M20 6L9 17l-5-5"
- `IconX` — "M18 6L6 18M6 6l12 12"
- `IconCrown` — "M2 20h20M5 20V10l7-7 7 7v10" (simplified crown)
- `IconWifi` — wifi signal arcs (for sync indicator)
- `IconUpload` — "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" + "M17 8l-5-5-5 5" + "M12 3v12"
- `IconFilm` — rect with side notches and horizontal lines

═══════════════════════════════════════════════════════════
TASK 3 — CSS Variables & Font Setup
═══════════════════════════════════════════════════════════

3a. In client/index.html, add before </head>:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

3b. Replace the entire client/src/index.css with:
```css
*, *::before, *::after { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  font-family: 'DM Sans', ui-sans-serif, system-ui, sans-serif;
  background: #080C14;
  color: #F1F5F9;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
button, input, select { font: inherit; }
button { cursor: pointer; border: none; background: none; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
* { touch-action: manipulation; }
```

3c. At the TOP of App.module.css, before any other rule, add all CSS variables in :root. Then rewrite EVERY color value, font, border-radius, and shadow in the entire CSS file to use these variables. This is a full rewrite of App.module.css.

Full new App.module.css content — replace the entire file with this (expand each section as needed):

```css
:root {
  --bg-base: #080C14;
  --bg-surface: #0F1623;
  --bg-elevated: #161F2E;
  --bg-glass: rgba(15, 22, 35, 0.85);
  --border-subtle: rgba(255,255,255,0.05);
  --border-default: rgba(255,255,255,0.09);
  --border-accent: rgba(6,182,212,0.35);
  --accent: #06B6D4;
  --accent-hover: #22D3EE;
  --accent-host: #F59E0B;
  --accent-danger: #EF4444;
  --accent-success: #22C55E;
  --accent-warning: #F59E0B;
  --text-primary: #F1F5F9;
  --text-secondary: #94A3B8;
  --text-muted: #475569;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-full: 999px;
  --font-ui: 'DM Sans', ui-sans-serif, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --glow-cyan: 0 0 0 3px rgba(6,182,212,0.2), 0 0 20px rgba(6,182,212,0.12);
  --glow-amber: 0 0 0 3px rgba(245,158,11,0.2), 0 0 20px rgba(245,158,11,0.12);
  --glow-green: 0 0 0 3px rgba(34,197,94,0.3), 0 0 16px rgba(34,197,94,0.15);
  --transition: 0.18s ease;
}

/* Shell */
.shell {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-ui);
}

/* Top Bar */
.topBar {
  height: 52px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 12px;
  backdrop-filter: blur(12px);
  z-index: 10;
}

.topInfo { display: flex; align-items: center; gap: 10px; }
.topRight { display: flex; align-items: center; gap: 10px; }

.roomChip {
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.08em;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  color: var(--accent);
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 6px;
}
.roomChip:hover { background: rgba(6,182,212,0.08); border-color: var(--border-accent); }

.syncDot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--accent-success);
  flex-shrink: 0;
  box-shadow: 0 0 6px var(--accent-success);
}
.syncDot.syncing {
  background: var(--accent-warning);
  box-shadow: 0 0 6px var(--accent-warning);
  animation: pulse 1s infinite;
}
.syncDot.disconnected { background: var(--text-muted); box-shadow: none; }

@keyframes pulse {
  0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
}

.syncText { font-size: 12px; color: var(--text-secondary); }

.smallBtn {
  padding: 5px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  transition: var(--transition);
  display: flex;
  align-items: center;
  gap: 5px;
}
.smallBtn:hover { border-color: var(--border-accent); color: var(--accent); }

/* Main Area */
.mainArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

/* Video Panel */
.videoPanel { display: flex; flex-direction: column; min-height: 0; }
.videoSection { display: flex; flex-direction: column; flex: 1; min-height: 0; }

.videoWrapper {
  flex: 1;
  position: relative;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  min-height: 0;
}

.video {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

/* Control bar overlay */
.controlBarWrap {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
  padding: 32px 16px 14px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.videoWrapper:hover .controlBarWrap,
.videoWrapper:focus-within .controlBarWrap,
.controlBarWrap.alwaysVisible {
  opacity: 1;
  pointer-events: auto;
}

/* Control Bar */
.controlBar {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.seekRow { display: flex; align-items: center; gap: 8px; }

.seekSlider {
  flex: 1;
  height: 4px;
  cursor: pointer;
  accent-color: var(--accent);
  border-radius: 2px;
}

.ctrlRow {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ctrlLeft, .ctrlRight {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ctrlCenter { flex: 1; display: flex; justify-content: center; }

.ctrlBtn {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-primary);
  background: transparent;
  border: none;
  transition: background var(--transition);
  flex-shrink: 0;
}
.ctrlBtn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
.ctrlBtn:disabled { opacity: 0.35; cursor: default; }
.ctrlBtnLg { width: 40px; height: 40px; border-radius: var(--radius-md); }

.timeDisplay {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 90px;
}

.volumeSlider {
  width: 72px; height: 4px;
  cursor: pointer;
  accent-color: var(--accent);
}

.dropdown {
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 500;
  padding: 4px 6px;
  background: rgba(255,255,255,0.07);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
}
.dropdown:hover { border-color: var(--border-accent); }
.dropdown:disabled { opacity: 0.4; cursor: default; }

/* Webcam Strip */
.webcamStrip {
  height: 128px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  overflow-x: auto;
  overflow-y: hidden;
  align-items: center;
  transition: height 0.25s ease;
}
.webcamStrip.collapsed { height: 40px; }

.tile {
  flex-shrink: 0;
  width: 152px;
  height: 112px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-md);
  position: relative;
  overflow: hidden;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.tile.self { border-color: rgba(6,182,212,0.5); }
.tile.speaking { border-color: var(--accent-success); box-shadow: var(--glow-green); animation: speakPulse 0.6s ease infinite; }

@keyframes speakPulse {
  0%, 100% { box-shadow: var(--glow-green); }
  50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.15), 0 0 24px rgba(34,197,94,0.25); }
}

.tileVideo { width: 100%; height: 100%; object-fit: cover; }
.tile.self .tileVideo { transform: scaleX(-1); }

.placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; font-weight: 600; color: rgba(255,255,255,0.9);
}

.tileLabel {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 4px 6px;
  background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tileMutedBadge {
  position: absolute;
  top: 6px; right: 6px;
  background: rgba(0,0,0,0.72);
  border-radius: var(--radius-sm);
  padding: 3px;
  display: flex;
  color: var(--accent-danger);
}

.tileHostBadge {
  position: absolute;
  top: 6px; left: 6px;
  background: rgba(245,158,11,0.25);
  border: 1px solid rgba(245,158,11,0.4);
  border-radius: var(--radius-sm);
  padding: 2px 5px;
  font-size: 9px;
  font-weight: 600;
  color: var(--accent-host);
  letter-spacing: 0.05em;
}

.tileSelfBadge {
  position: absolute;
  top: 6px; left: 6px;
  background: rgba(6,182,212,0.2);
  border: 1px solid rgba(6,182,212,0.35);
  border-radius: var(--radius-sm);
  padding: 2px 5px;
  font-size: 9px;
  font-weight: 600;
  color: var(--accent);
}

/* Bottom Toolbar */
.bottomToolbar {
  height: 68px;
  flex-shrink: 0;
  background: var(--bg-surface);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  padding-bottom: max(0px, env(safe-area-inset-bottom));
}

.toolbarGroup {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbarDivider {
  width: 1px;
  height: 28px;
  background: var(--border-default);
  margin: 0 4px;
}

.toolbarBtn {
  width: 44px; height: 44px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-primary);
  transition: background var(--transition), border-color var(--transition), box-shadow var(--transition);
  position: relative;
  flex-shrink: 0;
}
.toolbarBtn:hover { background: var(--bg-elevated); border-color: var(--border-default); }
.toolbarBtn:active { transform: scale(0.93); }

.toolbarBtn.hostAction {
  background: rgba(245,158,11,0.12);
  border-color: rgba(245,158,11,0.3);
  color: var(--accent-host);
  width: 50px; height: 50px;
}
.toolbarBtn.hostAction:hover { box-shadow: var(--glow-amber); }

.toolbarBtn.danger {
  background: rgba(239,68,68,0.15);
  border-color: rgba(239,68,68,0.35);
  color: var(--accent-danger);
}
.toolbarBtn.danger:hover { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }

.toolbarBtn .badgeDot {
  position: absolute;
  top: 6px; right: 6px;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--accent-danger);
  border: 2px solid var(--bg-surface);
}

/* Side Panels */
.sidePanel {
  position: fixed;
  right: 0; top: 52px; bottom: 0;
  width: 320px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-subtle);
  display: flex; flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  backdrop-filter: blur(20px);
}
.sidePanel.open { transform: translateX(0); }

.panelHeader {
  height: 52px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 14px; font-weight: 600;
}

.panelCloseBtn {
  width: 32px; height: 32px;
  border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-secondary);
  transition: background var(--transition), color var(--transition);
}
.panelCloseBtn:hover { background: var(--bg-elevated); color: var(--text-primary); }

/* Chat */
.chatMessages {
  flex: 1; overflow-y: auto;
  padding: 12px;
  display: flex; flex-direction: column; gap: 8px;
}

.msgRow { display: flex; flex-direction: column; }
.msgRow.self { align-items: flex-end; }

.msgBubble {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: 13px;
  line-height: 1.45;
  word-break: break-word;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}
.msgRow.self .msgBubble {
  background: rgba(6,182,212,0.15);
  border-color: rgba(6,182,212,0.25);
}

.msgMeta {
  display: flex; align-items: center; gap: 6px;
  margin-bottom: 3px;
  font-size: 11px;
  color: var(--text-muted);
}
.msgName { font-weight: 600; color: var(--accent); }
.msgRow.self .msgName { color: var(--text-secondary); }

.chatInputRow {
  padding: 10px 12px;
  border-top: 1px solid var(--border-subtle);
  display: flex; gap: 8px;
}

.chatInput {
  flex: 1;
  padding: 9px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color var(--transition);
}
.chatInput:focus { border-color: var(--border-accent); }
.chatSendBtn {
  width: 38px; height: 38px;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: #000;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: background var(--transition);
}
.chatSendBtn:hover { background: var(--accent-hover); }

.chatEmpty {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

/* People Panel */
.membersList { flex: 1; overflow-y: auto; padding: 8px; list-style: none; margin: 0; display: flex; flex-direction: column; gap: 4px; }

.memberRow {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-md);
  transition: background var(--transition);
}
.memberRow:hover { background: var(--bg-elevated); }

.memberAvatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600;
  flex-shrink: 0;
  color: #fff;
}

.memberName { flex: 1; font-size: 13px; font-weight: 500; }

.memberBadges { display: flex; gap: 5px; align-items: center; }
.roleBadge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  padding: 2px 6px; border-radius: var(--radius-full);
  text-transform: uppercase;
}
.roleBadge.host { background: rgba(245,158,11,0.2); color: var(--accent-host); }
.roleBadge.you { background: rgba(6,182,212,0.2); color: var(--accent); }

.mediaIcon { color: var(--text-muted); display: flex; align-items: center; }
.mediaIcon.off { color: var(--accent-danger); }

/* Lobby */
.lobby {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(6,182,212,0.12), transparent),
              radial-gradient(ellipse 60% 80% at 80% 100%, rgba(245,158,11,0.06), transparent),
              #080C14;
}

.lobbyCard {
  width: min(480px, 100%);
  padding: 36px 32px;
  border-radius: var(--radius-xl);
  background: var(--bg-glass);
  border: 1px solid var(--border-default);
  box-shadow: 0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(20px);
  display: flex; flex-direction: column; gap: 14px;
  animation: cardUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes cardUp {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.lobbyBrand {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 6px;
}
.lobbyLogo {
  width: 40px; height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #06B6D4, #0891B2);
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--glow-cyan);
}
.lobbyTitle { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; }
.lobbySubtitle { font-size: 13px; color: var(--text-secondary); margin: 0; }

.lobbyInput {
  width: 100%;
  padding: 11px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.lobbyInput:focus { border-color: var(--border-accent); box-shadow: 0 0 0 3px rgba(6,182,212,0.12); }
.lobbyInput.mono { font-family: var(--font-mono); letter-spacing: 0.1em; text-transform: uppercase; }

.primaryBtn {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, #06B6D4, #0891B2);
  color: #000;
  font-size: 14px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: opacity var(--transition), box-shadow var(--transition);
  display: flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 4px 16px rgba(6,182,212,0.25);
}
.primaryBtn:hover { opacity: 0.92; box-shadow: 0 4px 24px rgba(6,182,212,0.35); }
.primaryBtn:active { transform: scale(0.98); }

.secondaryBtn {
  padding: 11px 16px;
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color var(--transition);
  display: flex; align-items: center; justify-content: center; gap: 7px;
}
.secondaryBtn:hover { border-color: var(--border-accent); }

.divider {
  display: flex; align-items: center; gap: 12px;
  color: var(--text-muted); font-size: 12px;
}
.divider::before, .divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border-subtle);
}

.errorText { font-size: 13px; color: var(--accent-danger); }

.lobbyFooter { font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 4px; }

/* File Upload */
.fileDropZone {
  padding: 16px;
  border: 1.5px dashed var(--border-default);
  border-radius: var(--radius-md);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.fileDropZone:hover, .fileDropZone.dragOver {
  border-color: var(--accent);
  background: rgba(6,182,212,0.04);
}
.fileDropText { font-size: 13px; color: var(--text-secondary); }
.fileDropHint { font-size: 11px; color: var(--text-muted); }
.fileLoaded {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2);
  border-radius: var(--radius-md);
  font-size: 12px; color: var(--accent-success);
}

/* Video Status Overlay */
.videoStatus {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px;
  pointer-events: none;
}
.videoStatusText { font-size: 14px; color: var(--text-secondary); }
.spinner {
  width: 32px; height: 32px;
  border: 2.5px solid var(--border-default);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Toast System */
.toastContainer {
  position: fixed;
  top: 60px; right: 16px;
  z-index: 999;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}

.toast {
  min-width: 240px; max-width: 340px;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  display: flex; align-items: center; gap: 10px;
  animation: toastIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: auto;
  border: 1px solid var(--border-default);
  backdrop-filter: blur(12px);
  background: var(--bg-glass);
  position: relative;
  overflow: hidden;
}

.toast.success { border-color: rgba(34,197,94,0.3); }
.toast.error { border-color: rgba(239,68,68,0.3); }
.toast.info { border-color: rgba(6,182,212,0.3); }

.toastProgress {
  position: absolute; bottom: 0; left: 0;
  height: 2px;
  background: var(--accent);
  animation: toastShrink 4s linear forwards;
}
.toast.success .toastProgress { background: var(--accent-success); }
.toast.error .toastProgress { background: var(--accent-danger); }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(20px) scale(0.96); }
  to { opacity: 1; transform: translateX(0) scale(1); }
}
@keyframes toastShrink { from { width: 100%; } to { width: 0%; } }

/* Banners */
.banner {
  padding: 8px 16px;
  background: rgba(245,158,11,0.1);
  border-bottom: 1px solid rgba(245,158,11,0.2);
  font-size: 13px;
  color: var(--accent-warning);
  text-align: center;
}

.errorBanner {
  padding: 8px 16px;
  background: rgba(239,68,68,0.1);
  border-bottom: 1px solid rgba(239,68,68,0.2);
  font-size: 13px;
  color: var(--accent-danger);
  text-align: center;
}

/* Debug Panel */
.debugPanel {
  position: fixed; right: 16px; bottom: 80px;
  background: rgba(0,0,0,0.95);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  padding: 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: #4ade80;
  z-index: 50;
  max-width: 300px;
  max-height: 200px;
  overflow-y: auto;
}

/* Misc */
.hidden { display: none; }
.hint { font-size: 13px; color: var(--text-muted); padding: 4px 0; }

/* === MOBILE === */
@media (max-width: 768px) {
  .sidePanel { width: 100%; top: 0; z-index: 200; }
  .topBar { height: auto; min-height: 48px; padding: 8px 12px; flex-wrap: wrap; row-gap: 6px; }
  .webcamStrip { height: 96px; }
  .tile { width: 112px; height: 84px; }
  .bottomToolbar { gap: 4px; padding: 0 8px; padding-bottom: max(6px, env(safe-area-inset-bottom)); justify-content: space-around; }
  .toolbarBtn { width: 48px; height: 48px; }
  .toolbarBtn.hostAction { width: 52px; height: 52px; }
  .controlBarWrap { opacity: 1; pointer-events: auto; padding: 24px 12px 10px; }
  .seekSlider { height: 6px; }
  .ctrlBtn { width: 36px; height: 36px; }
  .timeDisplay { font-size: 11px; min-width: 76px; }
}

@media (max-width: 480px) {
  .lobbyCard { padding: 24px 20px; }
  .tile { width: 88px; height: 66px; }
  .tileLabel { font-size: 9px; }
  .dropdown { display: none; }
  .bottomToolbar { height: 60px; }
  .toolbarBtn { width: 44px; height: 44px; }
}
```

═══════════════════════════════════════════════════════════
TASK 4 — Redesign LobbyScreen.jsx
═══════════════════════════════════════════════════════════

Replace LobbyScreen.jsx entirely. Keep the same props: onCreateRoom, onJoinRoom, error.

New LobbyScreen:
- Renders a centered card using styles.lobby and styles.lobbyCard
- Brand section at top: styles.lobbyBrand with film icon (IconFilm) + title "CineSync" + tagline
- Username input (styles.lobbyInput) with label "Your name"
- primaryBtn "Host a Session" with IconFilm icon — calls onCreateRoom(username.trim() || 'Guest')
- Divider with "or join existing"
- Room code input (styles.lobbyInput + styles.mono) placeholder "ROOM CODE" — auto-uppercase on change
- secondaryBtn "Join Session" — calls onJoinRoom(username.trim() || 'Guest', joinRoomId.toUpperCase())
- Error shown as styles.errorText (not a plain p)
- Footer: "No account needed · Streams peer-to-peer"
- Enter key on room input triggers join
- Both buttons show a loading spinner state while the async op runs

═══════════════════════════════════════════════════════════
TASK 5 — Redesign RoomScreen.jsx top bar and toolbar
═══════════════════════════════════════════════════════════

Top bar: use styles.roomChip for room code (includes IconCopy, shows IconCheck on copy). Sync dot + text. Member count.

Bottom toolbar: Three groups separated by .toolbarDivider:
- Group 1: Mic button (IconMic / IconMicOff), Camera button (IconCamera / IconCameraOff)
  - Mic off → danger class
  - Camera off → danger class
- Group 2 (host only): Play/Pause button with hostAction class (IconPlay / IconPause) based on video playing state
  - Pass videoRef down so RoomScreen can listen to play/pause events OR receive isPlaying prop
- Group 3: Chat button (IconMessageCircle) with badgeDot if unread, People button (IconUsers) with count badge, Leave button (IconPhoneOff) with danger class

Remove all emoji from this component.

═══════════════════════════════════════════════════════════
TASK 6 — Redesign VideoPlayer.jsx
═══════════════════════════════════════════════════════════

Replace the raw file input with a FileDropZone component (inline in VideoPlayer):

```jsx
function FileDropZone({ onFile }) {
  const [dragOver, setDragOver] = useState(false);
  const [loaded, setLoaded] = useState(null);
  const inputRef = useRef(null);

  const handle = (file) => {
    if (!file) return;
    setLoaded(file.name);
    onFile(file);
  };

  if (loaded) return (
    <div className={styles.fileLoaded}>
      <IconFilm size={14} />
      {loaded}
      <button onClick={() => { setLoaded(null); inputRef.current?.click(); }}
              style={{marginLeft:'auto', fontSize:11, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer'}}>
        Change
      </button>
    </div>
  );

  return (
    <div
      className={`${styles.fileDropZone} ${dragOver ? styles.dragOver : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files[0]); }}
    >
      <input ref={inputRef} type="file" accept="video/*" className={styles.hidden}
             onChange={e => handle(e.target.files?.[0])} />
      <IconUpload size={22} color="var(--text-muted)" />
      <span className={styles.fileDropText}>Drop a video file here</span>
      <span className={styles.fileDropHint}>or tap to browse · MP4, MKV, WebM</span>
    </div>
  );
}
```

Video status overlay: inside videoWrapper, add a conditionally rendered .videoStatus div:
- If !videoSrc && !streamConnected && isHost: render FileDropZone
- If !videoSrc && !streamConnected && !isHost: render spinner + status text
- If streamConnected: render nothing (or briefly show "Connected ✓" then fade)

The controlBarWrap must have `alwaysVisible` class added on mobile (check via a useEffect + window.innerWidth or CSS media query via matchMedia).

═══════════════════════════════════════════════════════════
TASK 7 — Redesign ControlBar.jsx (fix bugs from Task 1 + new design)
═══════════════════════════════════════════════════════════

Apply all bug fixes from Task 1d and 1e.

Replace emoji buttons with Icon components:
- ⏪ → IconSkipBack10
- ⏩ → IconSkipForward10  
- Play/Pause → IconPlay / IconPause based on `playing` state
- Volume → IconVolume2 / IconVolumeX
- Fullscreen → IconMaximize
- Settings → IconSettings (wrap quality dropdown in a small popover or just show the dropdown inline)

Structure the bar using .controlBar → .seekRow (full width seek) + .ctrlRow (.ctrlLeft | .ctrlCenter | .ctrlRight).

Viewer gets: seek/skip/play disabled (ctrlBtn disabled prop, not disabledStyle on entire bar — so volume and fullscreen still work).

Quality and FPS: combine into ONE dropdown with values "1080p·60fps", "720p·30fps", "480p·30fps", "360p·24fps". Parse on change.

On mobile (width < 480px), hide the quality dropdown (CSS handles this with .dropdown display:none).

═══════════════════════════════════════════════════════════
TASK 8 — Redesign ChatPanel.jsx
═══════════════════════════════════════════════════════════

Fix: add `import React, { useState, useEffect, useRef } from 'react';` at top.
Fix: render `{m.text}` not `{m.message}`.

New layout:
- Panel header: "Chat" + member count + close button (IconX)
- Message area: scrollable, shows bubble layout (own messages right-aligned with styles.msgRow self)
- Each message: msgRow → msgMeta (name + time) → msgBubble
- Empty state when no messages: centered IconMessageCircle + "No messages yet"
- Input row: chatInput + send button (IconSend or arrow icon — use a simple right-arrow SVG path "M5 12h14M12 5l7 7-7 7")

Add `IconSend` to Icons.jsx: path "M22 2L11 13" + "M22 2l-7 20-4-9-9-4 20-7z"

═══════════════════════════════════════════════════════════
TASK 9 — Redesign PeoplePanel.jsx and WebcamGrid.jsx
═══════════════════════════════════════════════════════════

PeoplePanel: 
- Fix import at top
- Each member row: avatar with deterministic gradient (hash username to pick from 8 gradient pairs) + name + role badges + media state icons (IconMic with red slash if muted, IconCamera with red slash if cam off)
- Gradient function:
  ```js
  const GRADIENTS = [
    ['#06B6D4','#0891B2'], ['#8B5CF6','#7C3AED'], ['#F59E0B','#D97706'],
    ['#EC4899','#DB2777'], ['#10B981','#059669'], ['#EF4444','#DC2626'],
    ['#3B82F6','#2563EB'], ['#F97316','#EA580C']
  ];
  function avatarGradient(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    const [a, b] = GRADIENTS[Math.abs(hash) % GRADIENTS.length];
    return `linear-gradient(135deg, ${a}, ${b})`;
  }
  ```

WebcamGrid:
- Apply the same avatarGradient to placeholder backgrounds
- Add .tileHostBadge (shows "HOST" text) for isHost participants
- Add .tileSelfBadge (shows "YOU") for isSelf
- Replace emoji 🔇 in micOff with IconMicOff SVG
- Keep existing video/audio srcObject logic unchanged

═══════════════════════════════════════════════════════════
TASK 10 — Create Toast System
═══════════════════════════════════════════════════════════

Create `client/src/components/Toast.jsx`:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from '../App.module.css';

let addToastFn = null;
export const toast = {
  success: (msg) => addToastFn?.({ type: 'success', msg }),
  error: (msg) => addToastFn?.({ type: 'error', msg }),
  info: (msg) => addToastFn?.({ type: 'info', msg }),
  warning: (msg) => addToastFn?.({ type: 'warning', msg }),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((t) => {
    const id = Date.now();
    setToasts(prev => [...prev.slice(-2), { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4200);
  }, []);
  useEffect(() => { addToastFn = add; return () => { addToastFn = null; }; }, [add]);
  return (
    <div className={styles.toastContainer}>
      {toasts.map(t => (
        <div key={t.id} className={`${styles.toast} ${styles[t.type] || ''}`}>
          {t.msg}
          <div className={styles.toastProgress} />
        </div>
      ))}
    </div>
  );
}
```

In App.jsx: import `ToastContainer` and render it at the top level (inside .shell, before LobbyScreen/RoomScreen).

Replace all `alert()` calls in useMediaDevices.js with `toast.error(...)`.

In App.jsx onCopyRoom: replace setCopied logic with `toast.success('Room code copied!')` (keep setCopied for the chip icon change too).

In App.jsx, show toast on stream connected: in the WebRTCManager `onStreamReceived` callback, call `toast.success('Stream connected ✓')`.

In App.jsx, show toast on host left: in `onHostLeft` handler, call `toast.info('Host disconnected. Reassigning...')`.

═══════════════════════════════════════════════════════════
FINAL CHECKS — After all tasks
═══════════════════════════════════════════════════════════

1. Verify no `React.useState` / `React.useEffect` remain — all must be destructured imports
2. Verify no emoji in any JSX (🎤 📹 ▶ 💬 👥 📴 ⏪ ⏩ 🔇 — all gone)
3. Verify no alert() calls remain
4. Verify no hardcoded color values in .module.css — all use var(--xxx)
5. Verify all imports in every file are at the TOP (not after export)
6. Verify videoRef.current?.paused is NOT used for icon selection anywhere — use playing state
7. Verify touch-action: manipulation is in index.css on * selector
8. Verify controlBarWrap has position:absolute and is inside videoWrapper
9. Run the app: lobby renders, create/join room works, video loads, chat sends messages and they appear, toolbar buttons show SVG icons not emoji
10. Test on mobile viewport (Chrome DevTools 375px width): no horizontal scroll, toolbar buttons are reachable, seek bar is visible and draggable
```

---

## Part 5 — Summary of All Files Changed

| File | Action | Key Changes |
|---|---|---|
| `index.html` | Edit | Add Google Fonts link tags |
| `index.css` | Full rewrite | Clean reset, DM Sans font, scrollbar, touch-action |
| `App.module.css` | Full rewrite | CSS variables, new component styles, proper mobile |
| `App.jsx` | Edit | Fix socket.disconnect(), fix debugOpen ref, add ToastContainer |
| `components/Icons.jsx` | **Create** | All inline SVG icons |
| `components/Toast.jsx` | **Create** | Global toast system |
| `components/LobbyScreen.jsx` | Full rewrite | Brand, proper layout, loading states, fix imports |
| `components/RoomScreen.jsx` | Edit | Replace emoji, use Icons, fix unread count, new toolbar groups |
| `components/VideoPlayer.jsx` | Edit | FileDropZone, video status overlay, fix import position |
| `components/ControlBar.jsx` | Edit | Fix bugs (playing state, RAF), replace emoji, fix viewer disable |
| `components/ChatPanel.jsx` | Edit | Fix import, fix m.text, bubble layout, empty state |
| `components/PeoplePanel.jsx` | Edit | Fix import, avatarGradient, SVG media state icons |
| `components/WebcamGrid.jsx` | Edit | avatarGradient placeholders, replace mic-off emoji, add badges |
| `hooks/useMediaDevices.js` | Edit | Replace alert() with toast, fix AudioContext reconnect |
| `hooks/useMediaConnections.js` | Edit | Add offeredPeers ref to prevent duplicate offers |
| `sync.js` | **DO NOT TOUCH** | — |
| `socket.js` | **DO NOT TOUCH** | — |
| `webrtc.js` | **DO NOT TOUCH** | — |
| `server/index.js` | **DO NOT TOUCH** | — |
