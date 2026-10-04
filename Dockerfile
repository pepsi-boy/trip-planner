# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Install server deps
COPY package*.json ./
RUN npm ci

# Install client deps
COPY client/package*.json ./client/
RUN cd client && npm ci

# Build client (outputs to /app/public)
COPY client ./client
RUN cd client && npm run build

# Build server
COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations
RUN npx tsc

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY migrations ./migrations
COPY fixtures ./fixtures

USER appuser

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/src/index.js"]
