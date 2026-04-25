FROM node:20-alpine

WORKDIR /app

# Install Python (required for ApplyPilot)
RUN apk add --no-cache python3 py3-pip chromium chromium-chromedriver

# Install ApplyPilot
RUN pip install applypilot --break-system-packages

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

CMD ["node", "src/server.js"]
