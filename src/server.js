require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = process.env.HOST || '0.0.0.0';

let server;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, err.stack);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

const startServer = async () => {
  logger.info('Initializing application startup...');
  logger.info(`Node runtime: ${process.version} | Environment: ${process.env.NODE_ENV || 'development'}`);

  // Connect to Database
  await connectDB();

  // Create HTTP server
  server = http.createServer(app);

  server.listen(PORT, HOST, () => {
    logger.info(`Server successfully started and listening on http://${HOST}:${PORT}`);
    logger.info(`Health check available at http://${HOST}:${PORT}/health`);
  });

  // Graceful shutdown handler
  const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Starting graceful shutdown sequence...`);

    // Force close after 10 seconds if lingering connections exist
    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcefully terminating process.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    if (server) {
      server.close(async () => {
        logger.info('HTTP server closed. No longer accepting connections.');
        try {
          await mongoose.connection.close(false);
          logger.info('MongoDB connection closed cleanly.');
          process.exit(0);
        } catch (dbErr) {
          logger.error(`Error closing MongoDB connection: ${dbErr.message}`);
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();

