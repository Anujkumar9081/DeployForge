const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB database
 * @param {string} uri - MongoDB connection string
 * @param {number} retries - Number of retries before giving up
 * @param {number} delay - Delay between retries in milliseconds
 */
const connectDB = async (uri = process.env.MONGODB_URI, retries = 5, delay = 5000) => {
  if (!uri) {
    logger.error('MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  // Event listeners for Mongoose connection lifecycle
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connection established successfully.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`MongoDB connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected.');
  });

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Attempting to connect to MongoDB (Attempt ${attempt}/${retries})...`);
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      return;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < retries) {
        logger.info(`Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        logger.error('All MongoDB connection attempts exhausted. Exiting process.');
        process.exit(1);
      }
    }
  }
};

/**
 * Check MongoDB connection status
 * @returns {object} Status details
 */
const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const stateCode = mongoose.connection.readyState;
  return {
    state: states[stateCode] || 'unknown',
    isConnected: stateCode === 1,
  };
};

module.exports = {
  connectDB,
  getDBStatus,
};

