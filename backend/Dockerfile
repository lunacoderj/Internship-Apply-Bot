# Use production-ready multi-stage build as default Dockerfile
# Stage 1: Build & Dependencies
FROM node:22-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 2: Runtime
FROM node:22-slim AS runner
WORKDIR /app

# Install Python and Chromium dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    ca-certificates \
    wget \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install applypilot and its dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir "applypilot==0.3.0"

ENV NODE_ENV=production
ENV LOG_LEVEL=warn
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Add non-root user for security
RUN groupadd -r -g 1001 appgroup && \
    useradd -r -u 1001 -g appgroup -m appuser

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

USER appuser

EXPOSE 3000

CMD ["node", "src/server.js"]
