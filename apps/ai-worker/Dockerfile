FROM node:22-alpine AS base
RUN npm install -g pnpm

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/events/package.json ./packages/events/
COPY packages/shared/package.json ./packages/shared/
COPY packages/ai-prompts/package.json ./packages/ai-prompts/
COPY apps/ai-worker/package.json ./apps/ai-worker/
RUN pnpm install --frozen-lockfile --filter @bizbot/ai-worker...

# ── Builder ───────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/events/node_modules ./packages/events/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/ai-prompts/node_modules ./packages/ai-prompts/node_modules
COPY --from=deps /app/apps/ai-worker/node_modules ./apps/ai-worker/node_modules
COPY tsconfig.base.json ./
COPY packages/database ./packages/database
COPY packages/events ./packages/events
COPY packages/shared ./packages/shared
COPY packages/ai-prompts ./packages/ai-prompts
COPY apps/ai-worker ./apps/ai-worker
RUN pnpm --filter @bizbot/ai-worker build

# ── Runner ────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/ai-worker/dist ./dist
COPY --from=builder /app/apps/ai-worker/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

CMD ["node", "dist/index.js"]
