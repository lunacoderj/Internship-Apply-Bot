# Use production-ready multi-stage build as default Dockerfile
# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app

# Install Python and Chromium (required for ApplyPilot/Puppeteer)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Install applypilot and its dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir "applypilot==0.3.0"

ENV NODE_ENV=production
ENV LOG_LEVEL=warn
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Add non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER appuser

EXPOSE 3000

CMD ["node", "src/server.js"]
