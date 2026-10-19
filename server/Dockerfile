# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package.json ./package.json
COPY --chown=nodejs:nodejs src ./src
USER nodejs
EXPOSE 3001
CMD ["node", "src/index.js"]\r\n