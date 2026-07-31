const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration (allow all origins in production & local)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    system: 'Bigland Sentul Hotel HRIS API',
    status: 'Active',
    version: '2.0.0 (Production Full-Stack)',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    message: 'Terjadi kesalahan internal pada server.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server immediately on 0.0.0.0 so Railway proxy router connects instantly
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server Bigland HRIS running on port ${PORT} (host: 0.0.0.0)`);
  
  // Background database sync
  sequelize.sync({ alter: true }).then(() => {
    console.log('✅ MySQL Database synchronized successfully.');
  }).catch(err => {
    console.error('⚠️ Database sync warning:', err.message);
  });
});

module.exports = app;
