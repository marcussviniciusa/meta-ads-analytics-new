const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const Redis = require('ioredis');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adAccountRoutes = require('./routes/adAccountRoutes');
const reportRoutes = require('./routes/reportRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const googleAnalyticsRoutes = require('./routes/googleAnalyticsRoutes');

// Import middleware
const { errorHandler } = require('./middleware/errorMiddleware');
const { authMiddleware } = require('./middleware/authMiddleware');

// Initialize database connections
// Use hardcoded values that are confirmed to work
const pgPool = new Pool({
  host: '77.37.41.106',
  port: 5432,
  database: 'speedfunnels_v2',
  user: 'postgres',
  password: 'Marcus1911!!Marcus'
});

// Use hardcoded values that are confirmed to work
const redisClient = new Redis({
  host: '77.37.41.106',
  port: 6380,
  password: 'Marcus1911Marcus'
});

// Verify database connections
(async () => {
  try {
    // Test PostgreSQL connection
    const pgClient = await pgPool.connect();
    console.log('PostgreSQL connected');
    pgClient.release();

    // Test Redis connection
    await redisClient.ping();
    console.log('Redis connected');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
})();

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Adicionar middleware de log para todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes(pgPool));
app.use('/api/ad-accounts', authMiddleware, adAccountRoutes(redisClient, pgPool));
app.use('/api/reports', authMiddleware, reportRoutes(redisClient, pgPool));
app.use('/api/integrations', authMiddleware, integrationRoutes(redisClient, pgPool));
app.use('/api/google-analytics', authMiddleware, googleAnalyticsRoutes(redisClient, pgPool));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: 'Recurso não encontrado', path: req.path });
});



// Global error handler
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
