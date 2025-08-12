# Use official Bun image
FROM oven/bun:1.1.27-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source code
COPY src ./src
COPY tsconfig.json ./
COPY .env.example ./

# Build the application
RUN bun run build

# Production stage
FROM oven/bun:1.1.27-alpine AS production

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bun -u 1001

# Copy built application and dependencies
COPY --from=base --chown=bun:nodejs /app/node_modules ./node_modules
COPY --from=base --chown=bun:nodejs /app/dist ./dist
COPY --from=base --chown=bun:nodejs /app/package.json ./
COPY --from=base --chown=bun:nodejs /app/.env.example ./

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3006

# Expose the port
EXPOSE 3006

# Switch to non-root user
USER bun

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD bun --version || exit 1

# Start the application
CMD ["bun", "run", "dist/index.js"]
