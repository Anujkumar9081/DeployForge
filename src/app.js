const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const requestLogger = require('./middleware/requestLogger');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./routes/healthRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Request logging middleware
app.use(requestLogger);

// Mount routes
// /health endpoint for Docker and monitoring
app.use('/', healthRoutes);

// /api/tasks endpoints
app.use('/api/tasks', taskRoutes);

// Root route welcoming message
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Containerized Backend API is running',
    version: '1.0.0',
    documentation: {
      health: 'GET /health',
      tasks: 'GET /api/tasks',
    },
  });
});

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;

