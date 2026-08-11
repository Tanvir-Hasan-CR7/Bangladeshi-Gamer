# Multi-stage Dockerfile for ajlb-sync-service
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./
RUN npm ci

# Copy application source code
COPY . .

# Run type check and production build
RUN npm run lint
RUN npm run build

# Production runtime container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/sync-service.ts ./
COPY --from=builder /app/src ./src

# Expose health check port
EXPOSE 3000

# Run sync service in background daemon mode
CMD ["npm", "run", "start"]
