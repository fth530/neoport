# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies (needed for compilation if any)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (including devDeps for build if scripts need them, but here we prune later)
RUN npm install

# Copy source
COPY . .

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Set env
ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy app source from builder (excluding what's not needed, but for simple node app copying src is fine)
# Better: Copy only necessary files
COPY --from=builder /usr/src/app .

# Create directory for db and logs
RUN mkdir -p logs backups

# Expose port
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start command
CMD ["node", "server.js"]
