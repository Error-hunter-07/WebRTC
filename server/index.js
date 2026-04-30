import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';

const app = express();
app.use(cors({ origin: true }));
app.get('/health', (_, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [/localhost:\d+$/, /127\.0\.0\.1:\d+$/, /.*\.vercel\.app$/, /.*\.vercel\.com$/],
    methods: ['GET', 'POST']
  }
});

const rooms = new Map();
const roomForSocket = new Map();
const MAX_VIEWERS = 4;

const makeId = () => crypto.randomBytes(3).toString('hex').toUpperCase();
const membersList = room => room.members.map(id => ({ socketId: id, username: room.usernames.get(id) || 'Guest', isHost: room.hostId === id }));
const getRoom = id => rooms.get(id);

const leaveRoom = (socket, reason = 'left') => {
  const roomId = roomForSocket.get(socket.id);
  if (!roomId) return;
  const room = getRoom(roomId);
  roomForSocket.delete(socket.id);
  if (!room) return;
  room.members = room.members.filter(id => id !== socket.id);
  room.usernames.delete(socket.id);
  socket.leave(roomId);
  socket.to(roomId).emit('user-left', { socketId: socket.id, reason });
  if (room.hostId === socket.id) {
    socket.to(roomId).emit('host-left', { socketId: socket.id });
    room.hostId = room.members[0] || null;
    room.streamReady = false;
    if (room.hostId) io.to(roomId).emit('host-changed', { hostId: room.hostId, members: membersList(room) });
  }
  if (!room.members.length) rooms.delete(roomId);
};

io.on('connection', socket => {
  socket.on('create-room', (payload, ack) => {
    const username = typeof payload === 'object' ? payload?.username : payload?.username;
    const roomId = makeId();
    const room = { hostId: socket.id, members: [socket.id], usernames: new Map([[socket.id, username || 'Host']]), streamReady: false };
    rooms.set(roomId, room);
    roomForSocket.set(socket.id, roomId);
    socket.join(roomId);
    ack?.({ ok: true, roomId, members: membersList(room), hostId: socket.id });
  });

  socket.on('join-room', (payload, ack) => {
    const roomId = typeof payload === 'string' ? payload : payload?.roomId;
    const username = typeof payload === 'object' ? payload?.username : undefined;
    const room = roomId && getRoom(roomId);
    if (!room) return ack?.({ ok: false, error: 'Room not found' });
    if (room.members.length >= MAX_VIEWERS + 1) return ack?.({ ok: false, error: 'Room full' });
    if (!room.members.includes(socket.id)) room.members.push(socket.id);
    room.usernames.set(socket.id, username || 'Guest');
    roomForSocket.set(socket.id, roomId);
    socket.join(roomId);
    ack?.({ ok: true, roomId, members: membersList(room), hostId: room.hostId, streamReady: room.streamReady });
    socket.to(roomId).emit('user-joined', { socketId: socket.id, username: room.usernames.get(socket.id), members: membersList(room) });
    socket.emit('room-joined', { roomId, members: membersList(room), hostId: room.hostId });
  });

  socket.on('sync-event', data => {
    const roomId = data?.roomId || roomForSocket.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('sync-event', data);
  });

  socket.on('heartbeat', data => {
    const roomId = data?.roomId || roomForSocket.get(socket.id);
    if (!roomId) return;
    socket.to(roomId).emit('heartbeat', data);
  });

  socket.on('chat', data => {
    const roomId = data?.roomId || roomForSocket.get(socket.id);
    if (!roomId) return;
    io.to(roomId).emit('chat', { ...data, socketId: socket.id, ts: Date.now() });
  });

  socket.on('host-loaded-video', data => {
    const roomId = data?.roomId || roomForSocket.get(socket.id);
    if (!roomId) return;
    io.to(roomId).emit('host-loaded-video', { roomId, socketId: socket.id });
  });

  socket.on('request-stream', data => {
    const roomId = data?.roomId || roomForSocket.get(socket.id);
    const room = roomId && getRoom(roomId);
    if (!room || room.hostId === socket.id) return;
    io.to(room.hostId).emit('viewer-wants-stream', { roomId, viewerSocketId: socket.id });
  });

  socket.on('webrtc-offer', data => {
    if (!data?.targetSocketId) return;
    io.to(data.targetSocketId).emit('webrtc-offer', { ...data, fromSocketId: socket.id });
  });

  socket.on('webrtc-answer', data => {
    if (!data?.targetSocketId) return;
    io.to(data.targetSocketId).emit('webrtc-answer', { ...data, fromSocketId: socket.id });
  });

  socket.on('webrtc-ice', data => {
    if (!data?.targetSocketId) return;
    io.to(data.targetSocketId).emit('webrtc-ice', { ...data, fromSocketId: socket.id });
  });

  socket.on('host-stream-ready', data => {
    const roomId = data?.roomId || roomForSocket.get(socket.id);
    const room = roomId && getRoom(roomId);
    if (!room) return;
    room.streamReady = true;
    socket.to(roomId).emit('host-stream-ready', { roomId, hostSocketId: socket.id });
  });

  socket.on('disconnect', () => leaveRoom(socket, 'disconnect'));
});

server.listen(4000, () => console.log('Server running on http://localhost:4000'));
