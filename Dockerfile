# ==============================================================================
# Multi-Stage Dockerfile for Production Node.js Backend
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency Installation
# ------------------------------------------------------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install only production dependencies cleanly
# If package-lock.json is present, npm ci is used; otherwise npm install --omit=dev
RUN if [ -f package-lock.json ]; then \
      npm ci --omit=dev --ignore-scripts; \
    else \
      npm install --omit=dev --ignore-scripts; \
    fi

# ------------------------------------------------------------------------------
# Stage 2: Final Production Runtime Image
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Set production environment variables
ENV NODE_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0

WORKDIR /app

# Copy production node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy package manifests and application source code
COPY package*.json ./
COPY src/ ./src/

# Ensure all files are owned by the unprivileged 'node' user provided by Alpine
RUN chown -R node:node /app

# Switch to non-root user for principle of least privilege
USER node

# Expose internal backend application port
EXPOSE 5000

# Health check to ensure the container is responding to HTTP traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Launch the Node.js application
CMD ["node", "src/server.js"]

