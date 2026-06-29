const express = require('express');
const cors = require('cors');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const connectDB = require('./config/db');
const { startMandateCron } = require('./cron/mandateProcessor');

// Route imports
const authRoutes = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const employeeRoutes = require('./routes/employee.routes');
const adminRoutes = require('./routes/admin.routes');
const mandateRoutes = require('./routes/mandate.routes');
const auth = require('./middleware/auth');
const User = require('./models/User');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH'],
    credentials: true
  }
});

app.set('io', io);

// Socket.io room joins
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const { generalRateLimiter } = require('./middleware/rateLimiter');
const { securityGuard } = require('./middleware/security');

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true
}));
app.use(express.json());
app.use('/api', generalRateLimiter);
app.use('/api', securityGuard);

// Passport Google OAuth setup
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  let googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
  if (googleCallbackUrl && !googleCallbackUrl.endsWith('/api/auth/google/callback')) {
    googleCallbackUrl = googleCallbackUrl.replace(/\/$/, '') + '/api/auth/google/callback';
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackUrl,
      },
      (accessToken, refreshToken, profile, done) => {
        // Pass the profile to the callback handler
        return done(null, profile);
      }
    )
  );
  app.use(passport.initialize());
  console.log('Google OAuth configured.');
} else {
  console.log('Google OAuth not configured (missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env).');
  // Still initialize passport so routes don't crash
  app.use(passport.initialize());
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/employee', employeeRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/customer/mandates', mandateRoutes);

// VPA recipient resolution endpoint (UPI simulation)
app.get('/api/users/resolve', auth, async (req, res) => {
  try {
    const { vpa } = req.query;
    if (!vpa) {
      return res.status(400).json({ success: false, message: 'VPA is required.' });
    }
    const resolvedUser = await User.findOne({ vpa: vpa.toLowerCase(), role: 'customer' });
    if (!resolvedUser) {
      return res.status(404).json({ success: false, message: 'Recipient VPA not found.' });
    }
    res.json({
      success: true,
      name: `${resolvedUser.firstName} ${resolvedUser.lastName}`,
      vpa: resolvedUser.vpa,
      accountNumber: resolvedUser.accounts.find(a => a.accountType === 'Savings')?.accountNumber || resolvedUser.accounts[0]?.accountNumber
    });
  } catch (error) {
    console.error('Resolve VPA error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  // Start mandate cron job
  startMandateCron();

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
