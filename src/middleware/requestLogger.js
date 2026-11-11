const morgan = require('morgan');

// Custom token for ISO timestamp
morgan.token('timestamp', () => new Date().toISOString());

// Format: [2026-11-10T...] [HTTP] GET /api/tasks 200 12.34ms - 127.0.0.1
const logFormat = '[:timestamp] [HTTP] :method :url :status :response-time ms - :remote-addr';

const requestLogger = morgan(logFormat, {
  // Skip logging health check endpoints in production to avoid noisy logs if desired,
  // or keep it to see health check pings. Let's log all or skip high-frequency health checks if configured.
  skip: (req) => {
    // Optional: skip frequent health checks if SKIP_HEALTH_LOGS is set
    return process.env.SKIP_HEALTH_LOGS === 'true' && req.url === '/health';
  },
});

module.exports = requestLogger;

