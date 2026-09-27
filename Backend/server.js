const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/marketlink';

// Configure CORS to allow Frontend connections
app.use(cors({
  origin: true, // Allow any origin in development / specified origins
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB Atlas / Local MongoDB
let cachedConnection = null;
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
    });
    console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('ℹ️ Ensure your MONGODB_URI is set correctly in Backend/.env and your IP is whitelisted on Mongo Atlas Network Access.');
  }
};

connectDB();

// Middleware to ensure DB is connected for serverless invocations (Vercel)
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/') return next();
  if (mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
    } catch (e) {
      return res.status(503).json({ message: 'Database unavailable', error: e.message });
    }
  }
  next();
});

// Health / Status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MarketLink API Server is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'MarketLink API Server Running' });
});

// Register Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const marketRoutes = require('./routes/markets');
const reviewRoutes = require('./routes/reviews');
const farmerRoutes = require('./routes/farmers');
const adminRoutes = require('./routes/admin');
const snapshotRoutes = require('./routes/snapshot');
const notificationRoutes = require('./routes/notifications');
const subscriptionRoutes = require('./routes/subscriptions');
const announcementRoutes = require('./routes/announcements');
const categoryRoutes = require('./routes/categories');
const reportRoutes = require('./routes/reports');
const cartRoutes = require('./routes/cart');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/snapshot', snapshotRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/ai', aiRoutes);

// Serve built frontend (copied into Backend/public by Railway start script)
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

// Global error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err.stack || err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Something went wrong on the server!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Catch-all: serve React index.html for any non-API route (SPA support)
const fs = require('fs');
const indexPath = path.join(publicDir, 'index.html');
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ message: 'Not found' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 MarketLink Server running on http://localhost:${PORT}`);
});

module.exports = app;
