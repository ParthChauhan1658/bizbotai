FROM node:22-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/events/package.json ./packages/events/
COPY packages/shared/package.json ./packages/shared/
COPY apps/notification-worker/package.json ./apps/notification-worker/
RUN pnpm install --frozen-lockfile --filter @bizbot/notification-worker...

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/events/node_modules ./packages/events/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/notification-worker/node_modules ./apps/notification-worker/node_modules
COPY tsconfig.base.json ./
COPY packages/database ./packages/database
COPY packages/events ./packages/events
COPY packages/shared ./packages/shared
COPY apps/notification-worker ./apps/notification-worker
RUN pnpm --filter @bizbot/notification-worker build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/apps/notification-worker/dist ./dist
COPY --from=builder /app/apps/notification-worker/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

CMD ["node", "dist/index.js"]