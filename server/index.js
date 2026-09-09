import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { get } from './db/index.js';
import { initLiveCounts } from './realtime/presence.js';
import { attachSocket } from './realtime/socket.js';
import { setIo } from './lib/notify.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import gameRoutes from './routes/games.js';
import serverRoutes from './routes/servers.js';
import communityRoutes from './routes/communities.js';
import chatRoutes from './routes/chats.js';
import lfgRoutes from './routes/lfg.js';
import friendRoutes from './routes/friends.js';
import eventRoutes from './routes/events.js';
import postRoutes from './routes/posts.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import reelsRoutes from './routes/reels.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4000;

if (!get('SELECT id FROM games LIMIT 1')) {
  console.log('⚠️  לא נמצאו נתונים — מריץ seed אוטומטית...');
  await import('./db/seed.js');
}

initLiveCounts();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/lfg', lfgRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reels', reelsRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Serve the built frontend from the same service in production, so the
// whole app is a single deployable unit (no separate frontend host needed).
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'שגיאת שרת' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
setIo(io);
attachSocket(io);

httpServer.listen(PORT, () => {
  console.log(`🎮 HC Israel server running on http://localhost:${PORT}`);
});
