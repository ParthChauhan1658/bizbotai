FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/events/package.json ./packages/events/
COPY packages/shared/package.json ./packages/shared/
COPY apps/webhook-server/package.json ./apps/webhook-server/
RUN pnpm install --frozen-lockfile --filter @bizbot/webhook-server...

# ── Builder ───────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/events/node_modules ./packages/events/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/webhook-server/node_modules ./apps/webhook-server/node_modules
COPY tsconfig.base.json ./
COPY packages/database ./packages/database
COPY packages/events ./packages/events
COPY packages/shared ./packages/shared
COPY apps/webhook-server ./apps/webhook-server
RUN pnpm --filter @bizbot/webhook-server build

# ── Runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/webhook-server/dist ./dist
COPY --from=builder /app/apps/webhook-server/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

EXPOSE 3001
CMD ["node", "dist/index.js"]
