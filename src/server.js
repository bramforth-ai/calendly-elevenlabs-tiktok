// src/server.js
require('./utils/secure-logging');
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const config = require('./config/environment');
const calendlyRoutes = require('./routes/calendly');
const notificationsRoutes = require('./routes/notifications');
const elevenlabsRoutes = require('./routes/elevenlabs');
const promptBuilderRoutes = require('./routes/promptBuilder');
const ttsRoutes = require('./routes/tts');

// Import authentication middleware
const auth = require('./middleware/auth');

// Initialize Express app
const app = express();
app.set('trust proxy', 1);
const PORT = config.port;

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Add security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// Apply basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS with security settings
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.APP_URL || 'http://localhost:3000'].concat(
        (process.env.ALLOWED_ORIGINS || '').split(',').filter(origin => origin.trim())
      )
    : '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
  maxAge: 86400 // 24 hours
};
app.use(cors(corsOptions));

// API rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Enable rate limiting for API routes
app.use('/api', apiLimiter);

// Protect admin-specific static files with admin auth
app.get(['/agent-builder.html', '/prompt-builder.html'], auth.adminAuth, (req, res, next) => {
  next();
});

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public'), {
  // Add security headers for static files
  setHeaders: (res, path) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');
  }
}));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Apply authentication middleware to all API routes
app.use('/api', auth.authenticateApiKey);

// API Routes
app.use('/api/calendly', calendlyRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/elevenlabs', elevenlabsRoutes);
app.use('/api/prompt-builder', promptBuilderRoutes);
app.use('/api/tts', ttsRoutes);

// Global error handler
app.use((err, req, res, next) => {
  // Log the error for server-side debugging
  console.error('Unhandled error:', err);
  
  // Send sanitized error response
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    requestId: req.id
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
  ================================================
  🚀 Server running on port ${PORT}
  🔗 ${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${PORT}
  🔒 Security features: Helmet, Rate limiting, HTTPS enforcement
  ================================================
  `);
});

module.exports = app;