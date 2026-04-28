# Mandamus Signaling Server

Node.js + Socket.io WebRTC signaling server for the Virtual Hearing module.

## Run locally

```bash
cd backend/signaling
npm install
npm start        # production
npm run dev      # with nodemon (auto-restart)
```

Server runs on **http://localhost:4000**

## Health check
```
GET http://localhost:4000/health
```

## Deploy (free options)
- **Railway**: connect repo → set root to `backend/signaling` → deploy
- **Render**: New Web Service → root `backend/signaling` → start command `node server.js`
- **Fly.io**: free tier, always-on

After deploying, set `VITE_SIGNALING_URL=https://your-server-url` in Vercel environment variables.

## Events
| Event | Direction | Payload |
|---|---|---|
| `join-room` | client → server | `{ roomId, userId, role, name }` |
| `room-users` | server → client | `[{ socketId, userId, role, name }]` |
| `user-joined` | server → others | `{ socketId, userId, role, name }` |
| `offer` | client → server | `{ to, offer }` |
| `answer` | client → server | `{ to, answer }` |
| `ice-candidate` | client → server | `{ to, candidate }` |
| `user-disconnected` | server → others | `{ socketId }` |
