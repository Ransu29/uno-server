# --- Stage 1: Builder ---
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first (optimizes Docker cache)
COPY package*.json ./

# Install ALL dependencies (including TypeScript)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript -> JavaScript
RUN npm run build

# --- Stage 2: Production ---
FROM node:18-alpine

WORKDIR /app

# Copy package files again
COPY package*.json ./

# Install ONLY production dependencies (skips TypeScript, Jest, etc.)
RUN npm install --only=production

# Copy built assets from Stage 1
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 3000

# Start command
CMD ["node", "dist/index.js"]