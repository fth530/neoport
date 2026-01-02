# Stage 1: Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (including devDependencies for build scripts/tests if needed)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# (Optional) Run tests or build scripts here if you had a build step
# RUN npm run build

# Remove devDependencies
RUN npm prune --production

# Stage 2: Production Stage
FROM node:18-alpine

WORKDIR /app

# Install PM2 globally and curl for healthchecks
RUN npm install pm2 -g && apk add --no-cache curl

# Copy only necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/middleware ./middleware
COPY --from=builder /app/utils ./utils
COPY --from=builder /app/server.js ./
COPY --from=builder /app/priceService.js ./
COPY --from=builder /app/ecosystem.config.js ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/scripts ./scripts

# Set permissions for scripts
RUN chmod +x /app/scripts/*.sh

# Create directory for SQLite database and volume mount
RUN mkdir -p /app/data
ENV DATABASE_PATH=/app/data/portfolio.db

# Expose port (internal)
EXPOSE 3000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start with PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js", "--env", "production"]
