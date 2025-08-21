# Heat Pumps Now - Internal Portal System
# Multi-stage Docker build for Next.js production deployment on port 3004

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat curl
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG NEXT_PUBLIC_SUPABASE_URL=https://busnutzyiygwpjmygnxs.supabase.co
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1c251dHp5aXlnd3BqbXlnbnhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3NDcxNDIsImV4cCI6MjA1MDMyMzE0Mn0.VpxadjBKoWUqNhNdFOUeS-ixKZNdR-bQ1QKKp0yD3VM
ARG SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1c251dHp5aXlnd3BqbXlnbnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc0NzE0MiwiZXhwIjoyMDUwMzIzMTQyfQ.Ot5yRDIRmMK7Qzg9HepLXGcNvHRnqEO9CHxsZ9gAHAg

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NODE_ENV=production
ENV PORT=3004

# Build the application
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

ENV NODE_ENV=production
ENV PORT=3004
ENV HOSTNAME="0.0.0.0"

# Create nodejs user and group
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration scripts and database utilities
COPY --from=builder --chown=nextjs:nodejs /app/migrations ./migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Copy package.json for version info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

# Expose port 3004
EXPOSE 3004

# Health check on port 3004
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3004/api/health || exit 1

# Start the application
CMD ["node", "server.js"]