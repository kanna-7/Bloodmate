const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const authRoutes = require('./routes/auth');
const donorRoutes = require('./routes/donor');
const seekerRoutes = require('./routes/seeker');
const adminRoutes = require('./routes/admin');
const alertRoutes = require('./routes/alerts');
const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
    credentials: true,
  },
});

// simple in-memory map of userId -> socketIds
const onlineUsers = new Map();

io.on('connection', (socket) => {
  socket.on('registerUser', (userId) => {
    if (!userId) return;
    const existing = onlineUsers.get(userId) || [];
    onlineUsers.set(userId, [...existing, socket.id]);
  });

  socket.on('disconnect', () => {
    for (const [userId, sockets] of onlineUsers.entries()) {
      const filtered = sockets.filter((id) => id !== socket.id);
      if (filtered.length === 0) {
        onlineUsers.delete(userId);
      } else {
        onlineUsers.set(userId, filtered);
      }
    }
  });
});

// helper for emitting emergency alerts
const emitEmergencyAlert = (alert) => {
  io.emit('emergencyAlert', alert);
};

app.set('ioEmitEmergency', emitEmergencyAlert);

// helper for sending private chat messages
const sendPrivateMessage = (userId, message) => {
  if (!userId) return;
  const key = String(userId);
  const sockets = onlineUsers.get(key);
  if (!sockets) return;
  sockets.forEach((socketId) => {
    io.to(socketId).emit('privateMessage', message);
  });
};

app.set('ioSendPrivate', sendPrivateMessage);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'Bloodmate API running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/seeker', seekerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/messages', messageRoutes);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment');
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, { dbName: 'bloodmate' })
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });

