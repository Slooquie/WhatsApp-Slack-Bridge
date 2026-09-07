# Multi-stage build for WhatsApp-Slack Bridge
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd backend && npm ci --only=production
RUN cd frontend && npm ci

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy backend dependencies and code
COPY --from=builder --chown=nodejs:nodejs /app/backend ./backend
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist

# Set user
USER nodejs

# Expose port
EXPOSE 8080

# Health check - the server speaks WebSocket, so a plain HTTP GET returns
# 426 Upgrade Required (never 200). Check that the port accepts connections.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const s=require('net').connect(process.env.PORT||8080,'127.0.0.1');s.setTimeout(5000,()=>process.exit(1));s.on('connect',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1))"

# Start the application
WORKDIR /app/backend
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
