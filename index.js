const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { sequelize } = require('./models');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173'],
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

// Database Sync & Server Start
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ MySQL Database synchronized successfully.');
  app.listen(PORT, () => {
    console.log(`🚀 Server Bigland HRIS running on port ${PORT}`);
  });
}).catch(err => {
  console.error('❌ Database connection/sync failed:', err.message);
  app.listen(PORT, () => {
    console.log(`⚠️ Server Bigland HRIS running on port ${PORT} (Database connection pending)`);
  });
});
