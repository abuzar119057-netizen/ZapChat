require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const { connectDB } = require('./config/db');
const setupSocket = require('./socket');
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const messageRoutes = require('./routes/messages');
const fileRoutes = require('./routes/files');
const adminRoutes = require('./routes/admin');
const groupRoutes = require('./routes/groups');
const storyRoutes = require('./routes/stories');
const callRoutes = require('./routes/calls');
const aiRoutes = require('./routes/ai');
const communityRoutes = require('./routes/community');
const recordingRoutes = require('./routes/recordings');
const avatarRoutes = require('./routes/avatar');
const fcmRoutes = require('./routes/fcm');

const app = express();

// Root route & Health check for cloud platform monitoring (Back4App, Render, etc.)
app.get(['/', '/health'], (req, res) => {
  res.status(200).json({ status: 'ok', message: 'ZapChat Backend API is running live' });
});


// Middleware - Allow all origins for mobile app compatibility
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Capacitor, curl, etc.)
    // Allow all origins for development and mobile APK
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static('uploads'));


// Main DB and GridFS Connections
const startServer = async () => {
  try {
    await connectDB();

    // Create HTTP server mapped with Express app
    const server = http.createServer(app);

    // Setup Socket.IO Server
    const io = new Server(server, {
      cors: {
        origin: '*', // Allow all origins including mobile apps
        methods: ['GET', 'POST'],
        credentials: false // Must be false when origin is *
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'],
      allowEIO3: true
    });
    app.set('io', io);
    setupSocket(io);

    // Setup Cron Jobs
    const setupCronJobs = require('./cron-jobs');
    setupCronJobs(io);

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/contacts', contactRoutes);
    app.use('/api/messages', messageRoutes);
    app.use('/api/files', fileRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/groups', groupRoutes);
    app.use('/api/stories', storyRoutes);
    app.use('/api/calls', callRoutes);
    app.use('/api/ai', aiRoutes);
    app.use('/api/community', communityRoutes);
    app.use('/api/recordings', recordingRoutes);
    app.use('/api/fcm', fcmRoutes);
    app.use('/api/avatar', avatarRoutes);


    // Server listen
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Fallback server running on port ${PORT}`);
    });
  }
};

startServer();

