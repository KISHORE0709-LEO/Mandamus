const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');

const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// rooms: { roomId: { socketId: { userId, role, name } } }
const rooms = {};

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: Object.keys(rooms).length }));

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);

  // ── JOIN ROOM ──────────────────────────────────────────────
  socket.on('join-room', ({ roomId, userId, role, name }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = {};
    rooms[roomId][socket.id] = { userId, role, name };

    // Tell the new user who is already in the room
    const existingUsers = Object.entries(rooms[roomId])
      .filter(([sid]) => sid !== socket.id)
      .map(([sid, info]) => ({ socketId: sid, ...info }));

    socket.emit('room-users', existingUsers);

    // Tell everyone else a new user joined
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userId,
      role,
      name,
    });

    console.log(`[Room ${roomId}] ${name} (${role}) joined. Total: ${Object.keys(rooms[roomId]).length}`);
  });

  // ── WEBRTC SIGNALING ───────────────────────────────────────
  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer });
  });

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer });
  });

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate });
  });

  // ── DISCONNECT ─────────────────────────────────────────────
  socket.on('disconnecting', () => {
    for (const roomId of socket.rooms) {
      if (rooms[roomId]) {
        const info = rooms[roomId][socket.id];
        delete rooms[roomId][socket.id];
        if (Object.keys(rooms[roomId]).length === 0) delete rooms[roomId];
        socket.to(roomId).emit('user-disconnected', { socketId: socket.id, ...info });
        console.log(`[-] ${info?.name || socket.id} left room ${roomId}`);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[-] Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Mandamus Signaling Server running on :${PORT}`));
