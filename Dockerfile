# Use official Bun image
FROM oven/bun:1.1.27-alpine AS base

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files first for better caching
COPY package.json ./
COPY bun.lockb* ./

# Install dependencies including dev dependencies for build
RUN bun install --frozen-lockfile

# Copy source code and config files
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.1.27-alpine AS production

# Set working directory
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Copy only production dependencies
COPY package.json ./
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm

# Copy built application from base stage
COPY --from=base --chown=appuser:appgroup /app/dist ./dist

# Set proper permissions
RUN chown -R appuser:appgroup /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3006

# Expose the port
EXPOSE 3006

# Switch to non-root user
USER appuser

# Health check with curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3006/health || exit 1

# Start the application
CMD ["bun", "run", "dist/index.js"]
