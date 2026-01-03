const express = require('express');
const cors = require('cors');
const http = require('http');
require('dotenv').config();

const { connectDB } = require('./config/db');
const SocketManager = require('./services/socketManager');
const tradeEngine = require('./services/TradeEngine');
const CleanupService = require('./services/cleanupService');

// Import routes
const authRoutes = require('./routes/auth');
const tradeRoutes = require('./routes/trades');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const marketRoutes = require('./routes/market');
const walletRoutes = require('./routes/wallet');
const copyTradeRoutes = require('./routes/copyTrade');
const ibRoutes = require('./routes/ib');
const { router: adminAuthRoutes } = require('./routes/adminAuth');
const adminUsersRoutes = require('./routes/adminUsers');
const adminWalletRoutes = require('./routes/adminWallet');
const adminCopyTradeRoutes = require('./routes/adminCopyTrade');
const adminIBRoutes = require('./routes/adminIB');
const supportRoutes = require('./routes/support');
const adminSupportRoutes = require('./routes/adminSupport');
const adminChargesRoutes = require('./routes/adminCharges');
const adminTradesRoutes = require('./routes/adminTrades');
const accountTypesRoutes = require('./routes/accountTypes');
const tradingAccountsRoutes = require('./routes/tradingAccounts');
const adminAccountTypesRoutes = require('./routes/adminAccountTypes');
const kycRoutes = require('./routes/kyc');
const adminKycRoutes = require('./routes/adminKyc');
const adminSettingsRoutes = require('./routes/adminSettings');
const adminCreditRoutes = require('./routes/adminCredit');

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with MetaApi configuration
const socketManager = new SocketManager(server, {
  metaApiToken: process.env.METAAPI_TOKEN,
  metaApiAccountId: process.env.METAAPI_ACCOUNT_ID
});

// Connect to MongoDB
connectDB();

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://trade.heddgecapitals.com',
      'https://api.heddgecapitals.com',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    // Also check CORS_ORIGINS from env
    if (process.env.CORS_ORIGINS) {
      const envOrigins = process.env.CORS_ORIGINS.split(',').map(s => s.trim());
      allowedOrigins.push(...envOrigins);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Blocked origin: ${origin}`);
      callback(null, true); // Allow anyway for now, log for debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/copy-trade', copyTradeRoutes);
app.use('/api/ib', ibRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/account-types', accountTypesRoutes);
app.use('/api/trading-accounts', tradingAccountsRoutes);
app.use('/api/kyc', kycRoutes);
// Admin routes - order matters! More specific routes first
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin/wallet', adminWalletRoutes);
app.use('/api/admin/copy-trade', adminCopyTradeRoutes);
app.use('/api/admin/ib', adminIBRoutes);
app.use('/api/admin/support', adminSupportRoutes);
app.use('/api/admin/charges', adminChargesRoutes);
app.use('/api/admin/trades', adminTradesRoutes);
app.use('/api/admin/account-types', adminAccountTypesRoutes);
app.use('/api/admin/kyc', adminKycRoutes);
app.use('/api/admin/settings', adminSettingsRoutes);
app.use('/api/admin/credit', adminCreditRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Concorddex Trading API is running',
    timestamp: new Date().toISOString()
  });
});

// WebSocket status endpoint
app.get('/api/websocket/status', (req, res) => {
  res.json({
    success: true,
    ...socketManager.getStats()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  const providerLabel = (process.env.METAAPI_TOKEN && process.env.METAAPI_ACCOUNT_ID)
    ? 'MetaApi.cloud (Real-time)'
    : 'none';

  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║     Concorddex Trading API Server             ║
  ║     Running on port ${PORT}                       ║
  ║     Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║     WebSocket: Enabled (Socket.IO)            ║
  ║     Data: ${providerLabel}                    ║
  ╚═══════════════════════════════════════════════╝
  `);
  
  // Start Socket.IO
  socketManager.start();
  
  // Start Trade Engine
  tradeEngine.setSocketIO(socketManager.io);
  tradeEngine.start();
  
  // Run cleanup on startup (fix orphaned trades)
  CleanupService.runAll();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  socketManager.stop();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = { app, server, socketManager };
