# How to Run Watch Together

## Local Development

### Prerequisites

- Node.js 18.0 or later ([download](https://nodejs.org/))
- npm 9.0 or later (comes with Node.js)
- Webcam/microphone (for Phase 3 features)
- Two or more browser windows/tabs or devices

### Setup

1. **Clone/open the project:**
   ```bash
   cd WebRTC
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   This installs the root workspace and both `server/` and `client/` subdirectories.

3. **Create .env file (optional, for custom server URL or TURN server):**
   ```bash
   cp client/.env.example client/.env
   ```
   
   Edit `client/.env`:
   ```
   VITE_SERVER_URL=http://localhost:4000
   VITE_TURN_URL=                    # Optional: stun:...
   VITE_TURN_USER=
   VITE_TURN_CREDENTIAL=
   ```

### Running Locally

#### Method 1: Concurrent (Recommended for Development)
```bash
npm run dev
```

This starts:
- **Server:** http://localhost:4000
- **Client:** http://localhost:5173

Both run in the same terminal with live reload.

#### Method 2: Manual (Two Terminals)

**Terminal 1 — Server:**
```bash
npm --prefix server run dev
```

**Terminal 2 — Client:**
```bash
npm --prefix client run dev
```

### Testing Locally

1. **Open two browser tabs:**
   - Tab 1: http://localhost:5173 (Alice)
   - Tab 2: http://localhost:5173 (Bob)

2. **Tab 1 — Create a room:**
   - Enter username "Alice"
   - Click "Create Room"
   - Note the room ID (e.g., "3AF310")

3. **Tab 2 — Join the room:**
   - Enter username "Bob"
   - Enter Room ID "3AF310"
   - Click "Join Room"
   - Both tabs show member list with Alice (host) and Bob

4. **Tab 1 — Load a video file:**
   - Click "Choose File" button
   - Select any MP4 file from your computer (or download [this sample](https://filesamples.com/samples/video/mp4/sample_640x360.mp4))
   - Wait for metadata to load (~1 second)

5. **Tab 2 — Wait for stream:**
   - Status shows "Stream connected ✓"
   - Video element receives WebRTC stream

6. **Test sync:**
   - Tab 1: Click Play
   - Tab 2: Video plays within 300ms
   - Tab 1: Seek to 1:00
   - Tab 2: Jumps to same position

7. **Test webcam/mic:**
   - Both tabs: Click camera icon in bottom toolbar
   - Webcam tiles appear in top strip
   - Click mic icon to toggle muting
   - Speak — watch volume indicator glow

---

## Deployment

### Option A: Vercel (Recommended for Vite + Node)

#### Prerequisites
- [Vercel CLI](https://vercel.com/cli) installed
- GitHub account (recommended)

#### Steps

1. **Build client:**
   ```bash
   npm run build
   ```

2. **Create `vercel.json` at root:**
   ```json
   {
     "buildCommand": "npm --prefix client run build",
     "outputDirectory": "client/dist",
     "serverless": {
       "memory": 512,
       "timeout": 30
     }
   }
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

   Vercel will deploy client to a static site and create a serverless function for the Express server.

4. **Set environment variables in Vercel dashboard:**
   ```
   VITE_SERVER_URL=https://your-vercel-domain.vercel.app
   VITE_TURN_URL=(optional)
   ```

#### Production URL
Your app will be available at: `https://your-project.vercel.app`

### Option B: Docker

**Dockerfile (at root):**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm --prefix client run build
EXPOSE 4000
CMD ["npm", "start"]
```

**Build & Run:**
```bash
docker build -t watch-together .
docker run -p 4000:4000 watch-together
```

Access at http://localhost:4000 (client served from server's dist folder).

### Option C: Railway / Heroku / Custom VPS

1. **Build client:**
   ```bash
   npm --prefix client run build
   ```

2. **Serve from server:**
   Modify `server/index.js` to serve static files:
   ```js
   const path = require('path');
   app.use(express.static(path.join(__dirname, '../client/dist')));
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../client/dist/index.html'));
   });
   ```

3. **Set `NODE_ENV=production` and deploy.**

---

## Network Setup

### Local Area Network (LAN)

To test on multiple devices on the same WiFi:

1. Find server machine's local IP:
   ```bash
   # macOS/Linux
   ifconfig | grep inet
   
   # Windows
   ipconfig | findstr IPv4
   ```
   Example: `192.168.1.100`

2. Update client `.env`:
   ```
   VITE_SERVER_URL=http://192.168.1.100:4000
   ```

3. On other devices, open:
   ```
   http://192.168.1.100:5173
   ```

### Internet (Remote Users)

For remote peer connections, you **must configure a TURN server** (bypasses NAT/firewall). Free TURN services:

- [Metered.ca](https://www.metered.ca/tools/openrelay/) (free tier)
- [Numb.org](numb.org) (free STUN/TURN, no auth required)

Then set in client `.env`:
```
VITE_TURN_URL=turn:numb.org
VITE_TURN_USER=
VITE_TURN_CREDENTIAL=
```

Or use a paid service like [Xirsys](https://xirsys.com/) for production.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CORS error" on connect | Check server CORS config in `server/index.js` — should allow `localhost:5173` and your Vercel domain |
| Viewer won't connect to stream | Ensure host file metadata loaded; check browser console for WebRTC errors |
| No sound from other participant | Their mic might be muted (red indicator on tile); check browser mic permissions |
| Camera won't turn on | Check browser camera permissions; allow access when prompted |
| Seek bar doesn't sync | Ensure host video plays first; viewer must click Play button |
| High latency on mobile | Mobile browsers may throttle media; reduce quality to 480p via dropdown |

---

## Advanced Configuration

### Custom STUN Servers

Edit `client/src/webrtc.js` and `client/src/hooks/useMediaConnections.js`:

```js
const baseIceServers = [
  { urls: 'stun:your-stun-server.com:3478' },
  { urls: 'stun:stun2.your-server.com:3478' }
];
```

### Server Port

Change in `server/index.js`:
```js
server.listen(3000, () => console.log('Server on port 3000'));
```

Then update client `.env` accordingly.

### Increase Max Viewers

Edit `server/index.js`:
```js
const MAX_VIEWERS = 8; // Was 4
```

Warning: Host upload bandwidth is the bottleneck (~2.5 Mbps per viewer at 1080p60fps).

---

## Health Check (Production)

```bash
curl https://your-domain.com/health
# Expected response: {"ok":true}
```

---

## Monitoring & Logs

### Server Logs (Development)
Console shows:
- "Server running on http://localhost:4000"
- Socket connections: "User joined room ABC123"

### Client Logs (Browser)
- Open DevTools (F12)
- Console tab shows WebRTC connection states, errors
- Network tab shows media bitrate, Socket.IO messages

### Debug Panel
Press **Ctrl+Shift+D** in app to show peer connection stats (desktop only).

---

## Next Steps

- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- See [IMPLEMENTATION.md](IMPLEMENTATION.md) for phase details
- Contributing: Follow the same code style; test locally before submitting PRs
