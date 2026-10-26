# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Install Node.js 20 and ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install AI Engine Python dependencies
COPY ai-engine/requirements.txt ./ai-engine/
RUN pip install --no-cache-dir -r ai-engine/requirements.txt

# 2. Install Node.js server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# 3. Copy source files
COPY ai-engine ./ai-engine
COPY server ./server
COPY database ./database
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production \
    PORT=3001 \
    AI_ENGINE_URL=http://127.0.0.1:5000 \
    FLASK_ENV=production

EXPOSE 3001

CMD ["./docker-entrypoint.sh"]
