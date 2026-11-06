const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Initialize database connection
connectDB();

const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  // Join user's personal room for direct notifications
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(userId.toString());
    }
  });

  // Join active chat room
  socket.on('join_chat', (conversationId) => {
    if (conversationId) {
      socket.join(conversationId.toString());
    }
  });

  socket.on('typing', ({ conversationId, userName }) => {
    socket.to(conversationId).emit('user_typing', { conversationId, userName });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(conversationId).emit('user_stop_typing', { conversationId });
  });

  socket.on('disconnect', () => {});
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve uploaded media statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Apply general API rate limiter to all /api routes
app.use('/api', apiLimiter);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Smart E-Commerce Product and Order Management System',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/seller', require('./routes/sellerRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/offers', require('./routes/offerRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(
    `[OmniMarket Backend Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`
  );
});
