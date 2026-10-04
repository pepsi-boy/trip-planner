# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY migrations ./migrations

RUN npm run build

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY migrations ./migrations
COPY fixtures ./fixtures

USER appuser

# PORT is set by the host (Render, Railway, Fly). Defaults to 3000 locally.
ENV PORT=3000
EXPOSE 3000

# Run migrations then start the server
CMD ["sh", "-c", "node dist/scripts/migrate.js && node dist/src/index.js"]
