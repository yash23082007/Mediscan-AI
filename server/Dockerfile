# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app/server
ENV NODE_ENV=production PORT=3001
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs
COPY --from=deps --chown=nodejs:nodejs /app/server/node_modules ./node_modules
COPY --chown=nodejs:nodejs server/package.json ./package.json
COPY --chown=nodejs:nodejs server/src ./src
COPY --chown=nodejs:nodejs server/scripts ./scripts
COPY --chown=nodejs:nodejs database/seed.sql /app/database/seed.sql
USER nodejs
EXPOSE 3001
CMD ["npm", "start"]