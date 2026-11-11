const { getDBStatus } = require('../config/db');

/**
 * @desc    Health check endpoint
 * @route   GET /health
 */
const getHealth = (req, res) => {
  const dbStatus = getDBStatus();
  const uptimeSeconds = process.uptime();

  const isHealthy = dbStatus.isConnected;
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    uptime: Number(uptimeSeconds.toFixed(2)),
    uptimeHuman: formatUptime(uptimeSeconds),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'operational',
      database: dbStatus.state,
    },
  });
};

/**
 * Format uptime into readable string (e.g., "1h 23m 45s")
 */
const formatUptime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs}h ${mins}m ${secs}s`;
};

module.exports = {
  getHealth,
};

