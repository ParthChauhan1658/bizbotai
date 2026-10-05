# BizBot AI - WhatsApp AI Chatbot-as-a-Service

> "Smart WhatsApp Assistant for Every Business"  
> A production-ready multi-tenant WhatsApp AI chatbot platform built for Indian SMBs to automate customer support, orders, appointments, and payments.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Event-Driven Architecture](#event-driven-architecture)
- [AI System](#ai-system)
- [MCP Microservices](#mcp-microservices)
- [Getting Started](#getting-started)
- [Development](#development)
- [Deployment](#deployment)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [Scripts](#scripts)
- [Testing](#testing)
- [Contributing](#contributing)

## Overview

BizBot AI is a WhatsApp-first AI chatbot-as-a-service that enables businesses (restaurants, clinics, salons, coaching centers, e-commerce, real estate, hotels) to deploy an AI-powered assistant in minutes without code. The bot handles conversations in multiple Indian languages (Hindi, English, Marathi, Tamil, Telugu, Kannada, Bengali, Gujarati), processes orders and bookings, generates Razorpay payment links, and seamlessly escalates to human agents when needed.

### Why BizBot AI?
- Built for India's WhatsApp-first market (550M+ WhatsApp users)
- Agentic AI with tool use (Claude 4) for taking actions, not just answering
- Multi-tenant architecture with strict tenant isolation
- Event-driven, horizontally scalable with Redis Streams + BullMQ
- RAG-powered knowledge base with pgvector embeddings (with keyword fallback)
- Human handoff mechanism for complex/sensitive cases
- Business hours awareness, usage limits, and granular analytics

## Key Features

### Core (Implemented)
- **Multi-tenant WhatsApp integration** - Meta WhatsApp Cloud API webhook receiver with signature verification
- **Agentic AI processing** - Claude (Haiku 4.5/Sonnet 4.6/Opus 4.6) with tool calling, multi-turn reasoning, automatic model routing
- **Knowledge Base (RAG)** - Per-business vector embeddings (Voyage AI) with pgvector similarity search + intelligent keyword fallback
- **Human handoff** - Conversation status tracking (`active`, `closed`, `handed_off`) with reason capture
- **Multi-language support** - Automatic language detection (Unicode-based) with contextual replies
- **Business hours awareness** - Auto-reply outside working hours
- **Usage limits** - Monthly message quotas per business/plan with automatic enforcement
- **Web dashboard** - Next.js 15 (App Router) with authentication, analytics, conversations, KB, settings, onboarding
- **tRPC API** - End-to-end type-safe API layer
- **Event-driven processing** - Redis Streams for reliable message processing with consumer groups, retries, pending message reclamation

### Supported Business Types
- **Restaurants** - Menu browsing, order creation, payment links
- **Clinics** - Service listing, slot availability, appointment booking
- **Salons** - Service catalog, availability checking, booking
- **E-commerce/D2C** - Order tracking, product inquiries
- **Coaching Centers** - Class schedules, fee reminders
- **Real Estate** - Property catalog, lead qualification
- **Hotels/Homestays** - Room availability, bookings
- **Generic** - Customizable via system prompts

## Tech Stack

| Layer | Technology |
|---|---|
| **Monorepo** | [Turborepo](https://turbo.build/repo) + [pnpm workspaces](https://pnpm.io/workspaces) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) 5.7.3 |
| **Web App** | [Next.js 15](https://nextjs.org/) (App Router) + React 19 + [Turbopack](https://turbo.build/pack) |
| **API Layer** | [tRPC 11](https://trpc.io/) (end-to-end type safety) |
| **Auth** | [Auth.js v5 (NextAuth)](https://authjs.dev/) with Google OAuth + Drizzle adapter |
| **Styling** | [Tailwind CSS 3.4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix UI primitives) + [Framer Motion](https://motion.dev/) |
| **Backend Runtime** | [Node.js](https://nodejs.org/) (>=20) + [tsx](https://tsx.is/) (dev), compiled TS (prod) |
| **Webhooks** | [Hono 4](https://hono.dev/) + [@hono/node-server](https://github.com/honojs/node-server) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [pgvector](https://github.com/pgvector/pgvector) (vector similarity search) |
| **ORM** | [Drizzle ORM 0.39](https://orm.drizzle.team/) + [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview) |
| **DB Hosting** | [Neon](https://neon.tech/) (serverless PostgreSQL) |
| **Cache/Queue/Streams** | [Redis 7](https://redis.io/) + [ioredis 5](https://github.com/luin/ioredis) + [BullMQ 5](https://docs.bullmq.io/) (job queues) |
| **AI Models** | [Anthropic Claude API](https://www.anthropic.com/claude) (Haiku 4.5, Sonnet 4.6, Opus 4.6) via [@anthropic-ai/sdk 0.80](https://www.npmjs.com/package/@anthropic-ai/sdk) |
| **Embeddings** | [Voyage AI](https://www.voyageai.com/) (`voyage-3.5-lite`) via `@bizbot/ai-prompts` |
| **MCP** | Custom HTTP-based MCP servers (per-domain microservices) |
| **Messaging** | [WhatsApp Cloud API (Meta Graph API v21.0)](https://developers.facebook.com/docs/whatsapp/cloud-api/) |
| **Payments** | [Razorpay API](https://razorpay.com/docs/api/) + webhook validation |
| **Email** | [Resend](https://resend.com/) |
| **Object Storage** | [Cloudflare R2](https://www.cloudflare.com/r2/) (or S3-compatible) |
| **Observability** | [Sentry](https://sentry.io/) (frontend + backend) + [OpenTelemetry](https://opentelemetry.io/) (OTLP) + [Prometheus](https://prometheus.io/) + [Grafana Loki](https://grafana.com/oss/loki/) + [Grafana](https://grafana.com/) |
| **Testing** | [Vitest 2](https://vitest.dev/) + [Playwright](https://playwright.dev/) (E2E) |
| **Linting/Format** | [ESLint 9](https://eslint.org/) + [Prettier 3](https://prettier.io/) + [TypeScript ESLint](https://typescript-eslint.io/) |

## Architecture

BizBot follows a modular, event-driven microservices architecture with clear separation of concerns:

```text
[WhatsApp Cloud API] → [Webhook Server (Hono)] → [Redis Streams (bizbot:messages)]
                                                          ↓
                                                    [AI Worker (Claude)]
                                                          ↓
                                                    [MCP Tools: KB/Order/Booking/Payment/CRM]
                                                          ↓
                                                    [WhatsApp API (outbound)]
```

### High-Level Flow

1. **Inbound message** - WhatsApp user sends message → Meta hits `/api/webhook/whatsapp` (POST)
2. **Validation** - Webhook server verifies Meta signature (X-Hub-Signature-256), returns 200 immediately
3. **Parsing & persistence** - Parse WhatsApp payload, upsert business/customer/conversation, save inbound message to PostgreSQL
4. **Event emission** - Publish `message.received` event to Redis Stream `bizbot:messages`
5. **AI processing** - AI Worker (consumer group) reads message, builds context (system prompt + KB + chat history)
6. **Model routing** - Intelligently routes to Haiku/Sonnet/Opus based on complexity (tool use needs, complaints, length)
7. **Agentic loop** - Claude may call tools multiple times (search KB, list menu, create order, check availability, book appointment, generate payment link, escalate to human)
8. **Tool execution** - Tools call domain-specific MCP microservices over HTTP
9. **Response** - AI generates reply, webhook worker/notification service sends via WhatsApp Cloud API, updates message status
10. **Analytics** - Track events (token usage, latency, model, tools used)

### Multi-Tenancy
- All data is tenant-scoped by `businessId` (FK on every entity)
- Business lookup via `waPhoneNumberId` on incoming WhatsApp messages
- Row-level isolation enforced in queries (`eq(businesses.id, businessId)`, etc.)
- Per-business KB, prompts, limits, config

## Project Structure

```text
Bizbot/
├── apps/
│   ├── web/                    # Next.js 15 dashboard (App Router)
│   ├── webhook-server/         # Hono webhook receiver (WhatsApp + Razorpay)
│   ├── ai-worker/              # Claude AI processor (Redis Streams consumer)
│   ├── analytics-worker/       # Analytics event processor
│   ├── billing-worker/         # Subscription/billing processing
│   ├── booking-worker/         # Booking reminders/jobs
│   ├── notification-worker/    # Outbound WhatsApp notifications
│   └── order-worker/           # Order status updates
│
├── packages/
│   ├── database/               # Drizzle ORM schemas, migrations, DB client
│   ├── events/                 # Event types (Zod), producer/consumer (Redis Streams)
│   ├── ai-prompts/             # Prompt templates + Voyage embeddings
│   ├── shared/                 # Shared utils, constants, helpers
│   ├── trpc/                   # tRPC router, procedures, context
│   └── eslint-config/          # Shared ESLint config (optional)
│
├── mcp-servers/
│   ├── kb-server/              # Knowledge Base MCP (search, RAG)
│   ├── order-server/           # Orders/Menu MCP (CRUD)
│   ├── booking-server/         # Appointments/Services/Availability
│   ├── payment-server/         # Payment links (Razorpay)
│   └── crm-server/             # CRM/customer operations
│
├── infrastructure/
│   └── docker/                 # docker-compose.yml + configs (nginx, otel, prometheus)
│
├── .turbo/                     # Turborepo cache
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace definition
├── package.json                # Root scripts/deps
├── tsconfig.base.json          # Base TS config
├── .env.example                # Environment template
├── PROJECT_PLAN.md             # Detailed product plan (976 lines)
├── SETUP_GUIDE.md              # Setup instructions
└── README.md                   # This file
```

## Data Model

The database uses PostgreSQL with Drizzle ORM. Key schemas (see `packages/database/src/schema/`):

### Core Entities

| Table | Purpose | Key Fields |
|---|---|---|
| `businesses` | Multi-tenant businesses | id, name, slug, owner*, businessType (restaurant/clinic/salon/ecommerce/...), waPhoneNumberId, waConnected, aiModel, systemPrompt, businessHours (jsonb), plan, monthlyMessageLimit, messagesUsedThisMonth, isActive |
| `customers` | WhatsApp customers per business | id, businessId (FK), waId (phone), name, firstMessageAt, lastMessageAt, totalMessages, language, email, phone, tags (text[]) |
| `conversations` | Conversation threads | id, businessId, customerId (FKs), status (active/closed/handoff), handedOffTo, handedOffAt, handoffReason, summary, sentiment, messageCount, aiMessagesCount, humanMessagesCount, resolvedByAi, customerRating |
| `messages` | All messages (inbound/outbound) | id, conversationId, businessId, customerId, direction (inbound/outbound), messageType (text/image/audio/video/doc/location/template/interactive), content, mediaUrl, waMessageId (unique), waStatus (sent/delivered/read/failed), waError, aiGenerated, aiModel, aiTokensUsed, aiCostUsd, aiLatencyMs, actionType, actionData (jsonb) |
| `knowledge_base` | RAG documents with embeddings | id, businessId, title, content, embedding (vector(1024) for Voyage), category, isActive, chunkIndex, sourceUrl |
| `orders` | Orders (restaurants/ecom) | id, businessId, customerId, orderNumber (unique), status (pending/confirmed/preparing/ready/delivered/cancelled), items (jsonb), subtotal/tax/delivery/total, paymentStatus (unpaid/paid/refunded), paymentId, razorpayPaymentId, razorpayOrderId, deliveryAddress, notes |
| `order_items` | Order line items | id, orderId, businessId, itemName, qty, price, notes |
| `appointments` | Bookings (clinics/salons) | id, businessId, customerId, appointmentNumber, serviceId, serviceName, status (pending/confirmed/completed/cancelled/no_show), appointmentDate, startTime, endTime, staffName, amount, paymentStatus, paymentLinkUrl, razorpayPaymentLinkId, notes, reminderSent24h, reminderSent1h |
| `services` | Service catalog | id, businessId, name, description, price, durationMinutes, category, isActive, imageUrl, requiresPayment, order |
| `menu_items` | Restaurant menu | id, businessId, name, description, price, category, imageUrl, isVeg (bool), isAvailable (bool), orderIndex |
| `analytics_events` | Event tracking | id, businessId, eventName, properties (jsonb), userId, sessionId, ip, userAgent, createdAt |
| `ai_usage` | AI cost/token tracking | id, businessId, model, inputTokens, outputTokens, totalTokens, costUsd, latencyMs, toolCalls (jsonb), conversationId, messageId |
| `billing_plans`, `subscriptions`, `invoices` | Billing (Razorpay) | Plan definitions, subscriptions, invoices |

### Auth (NextAuth Drizzle Adapter)
Tables: `users`, `accounts`, `sessions`, `verificationTokens` (Auth.js v5 schema)

See full schemas in `packages/database/src/schema/*.ts`.

## Event-Driven Architecture

BizBot uses Redis Streams for reliable, at-least-once message processing with consumer groups.

### Streams
Defined in `@bizbot/events` (`packages/events/src/types.ts`):
- `bizbot:messages` - Incoming WhatsApp messages
- `bizbot:orders` - Order lifecycle
- `bizbot:bookings` - Appointments/bookings
- `bizbot:payments` - Payment events (Razorpay webhooks)
- `bizbot:conversations` - Handoff, closure
- `bizbot:analytics` - Analytics tracking
- `bizbot:business` - Business lifecycle

### Key Events

| Event | Schema (Zod) | Producer | Consumer |
|---|---|---|---|
| `message.received` | `MessageReceivedEvent` | webhook-server (WhatsApp POST) | ai-worker |
| `message.send` | `MessageSendEvent` | ai-worker/notification-worker | notification-worker (outbound WhatsApp) |
| `message.status` | `MessageStatusEvent` | WhatsApp status webhooks | analytics-worker |
| `order.created/paid/status_changed` | Order events | order-server/MCP/tools | order-worker, notification-worker |
| `booking.created/reminder/status_changed` | Booking events | booking-server | booking-worker (reminders) |
| `payment.received` | `PaymentReceivedEvent` | webhook-server (Razorpay) | billing-worker, order/booking workers |
| `conversation.handoff` | `ConversationHandoffEvent` | AI tools (`escalate_to_human`) | notification-worker (alert business owner) |
| `analytics.track` | `AnalyticsTrackEvent` | ai-worker, webhooks, workers | analytics-worker |

### Reliability Features
- **Consumer groups** - Load balancing + fault tolerance across worker instances
- **Acknowledgements** (`XACK`) - Messages only removed after successful processing
- **Pending message reclamation** - AI worker reclaims pending messages from crashed consumers (via `XPENDING`/`XAUTOCLAIM`) on startup
- **At-least-once delivery** - Safe with idempotent processing
- **Block reads** (`XREADGROUP` with `BLOCK`) - Efficient, non-polling consumption
- **Retry strategy** - Failed messages not acked → become pending → reclaimed after timeout

## AI System

### Model Routing (`apps/ai-worker/src/model-router.ts`)

Intelligent routing based on message complexity to optimize cost/performance:

| Condition | Routed To | Rationale |
|---|---|---|
| Non-text (image/audio/video/document) | **Sonnet 4.6** | Better multimodality/understanding |
| Complaints/sensitive (angry, refund, fraud, Hindi equivalents: gussa, dhokha, shikayat) | **Sonnet 4.6** | Requires empathy, nuance, careful handling |
| Multi-intent (order + booking keywords) | **Sonnet 4.6** | Complex reasoning |
| Order/booking/payment intent (tool use likely) | **Sonnet 4.6** | Needs reliable tool calling |
| Message > 200 chars | **Sonnet 4.6** | More complex |
| Conversation history > 10 messages | **Sonnet 4.6** | Needs better context retention |
| Else (greetings, FAQs, simple Q&A) | **Haiku 4.5** | Fast, cost-efficient |

Defaults from business config: `aiModel` (default `claude-haiku-4-5`), `aiTemperature` (0.7), `maxTokensPerReply` (500).

### Agentic Loop (Tool Use)

AI worker implements a multi-turn agentic loop (`runAgentLoop` in `processor.ts`, max 5 iterations):
1. Call Claude with system prompt + KB context + chat history + available tools
2. If Claude returns `tool_use` blocks → execute tools (via MCP HTTP calls), append tool results
3. Feed results back to Claude → repeat until final text answer (or max iterations)
4. Prevents infinite loops, tracks all tools used + tokens

### Available Tools (`apps/ai-worker/src/tools.ts`)

Tools exposed to Claude (defined with Zod schemas):

| Tool | Purpose | MCP Server | When to Use |
|---|---|---|---|
| `search_knowledge_base` | RAG search over business KB (vector + fallback) | kb-server | Need business info not in recent context |
| `list_menu` | List restaurant menu items (grouped by category) | order-server | Customer asks "What's on menu?" |
| `create_order` | Create order from items + customer details | order-server | Customer wants to place order |
| `get_order` | Fetch order status/details by orderId | order-server | "Where's my order?" |
| `list_services` | List services (clinic/salon) with pricing/duration | booking-server | "What services do you offer?" |
| `check_availability` | Check available slots for service/date | booking-server | "Is [date/time] available?" |
| `create_appointment` | Book appointment with service/date/time | booking-server | Customer ready to book |
| `get_appointment` | Get appointment details/status | booking-server | Check booking status |
| `create_payment_link` | Generate Razorpay payment link (order/appointment) | payment-server | Customer wants to pay |
| `get_payment_status` | Check payment status | payment-server | "Did payment go through?" |
| `add_customer_note` | Add note to customer profile | crm-server | Track preferences/issues |
| `update_customer` | Update customer name/email/phone/tags | crm-server | Enrich CRM |
| `escalate_to_human` | Handoff to human agent (sets conversation to `handed_off`) | crm-server | Angry/complex/special case or unknown info |

### Knowledge Base (RAG)

**Implementation**: `mcp-servers/kb-server/src/tools/search-kb.ts`

1. **Vector search (primary)** - Generate embedding via Voyage AI (`voyage-3.5-lite`, 1024 dims) using `@bizbot/ai-prompts`. Query pgvector with `<=>` (cosine distance): similarity = `1 - (embedding <=> query_vec)`. Returns top 5 with similarity > 0.30.
2. **Keyword fallback (resilient)** - If vector search fails (no embeddings API, missing vectors) or returns < 1 result, falls back to token-based scoring (word overlap / total query words). Returns top 3 matches.
3. **Tenant-scoped** - Only searches KB docs for `businessId` where `isActive=true`.

**Prompts**: Business-type specific system prompts (`packages/ai-prompts/src/templates/`): `base.ts`, `restaurant.ts`, `clinic.ts`, `salon.ts`. KB context injected into system prompt when results found.

### Language Detection

Unicode range-based detection (`packages/shared/src/utils/index.ts`):
- Devanagari (`\u0900-\u097F`) → `hi` (Hindi/Marathi)
- Tamil (`\u0B80-\u0BFF`) → `ta`
- Telugu (`\u0C00-\u0C7F`) → `te`
- Bengali (`\u0980-\u09FF`) → `bn`
- Gujarati (`\u0A80-\u0AFF`) → `gu`
- Kannada (`\u0C80-\u0CFF`) → `kn`
- Default → `en`

AI always responds in customer's detected language.

## MCP Microservices

Model Context Protocol-style HTTP microservices (simple REST over HTTP, tool endpoints). Each runs independently on its own port.

| Server | Port (default) | URL Env Var | Tools |
|---|---|---|---|
| **kb-server** | 4001 | `MCP_KB_URL` | `search_knowledge_base` |
| **order-server** | 4002 | `MCP_ORDER_URL` | `list_menu`, `create_order`, `get_order`, `update_order_status`, `cancel_order` |
| **booking-server** | 4003 | `MCP_BOOKING_URL` | `list_services`, `check_availability`, `create_appointment`, `get_appointment`, `cancel_appointment`, `reschedule_appointment` |
| **payment-server** | 4004 | `MCP_PAYMENT_URL` | `create_payment_link`, `get_payment_status`, `verify_payment` |
| **crm-server** | 4005 | `MCP_CRM_URL` | `add_customer_note`, `update_customer`, `get_customer`, `escalate_to_human`, `close_conversation` |

**Request format**: `POST /tools/:toolName` with JSON body (Zod-validated in each tool impl).  
**Response**: `{ success: true, result: ... }` or `{ success: false, error: "..." }`

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 10.0.0 (packageManager: `pnpm@10.32.1`)
- **PostgreSQL** 16+ with `pgvector` extension (Neon recommended, or local via Docker)
- **Redis** 7+ (Upstash recommended, or local via Docker)
- **Docker & Docker Compose** (optional, for local infra)

### 1. Clone & Install

```bash
git clone <repo-url> Bizbot
cd Bizbot/Bizbot
pnpm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill all values:

```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) section for details on each key.

### 3. Start Local Infrastructure (Docker)

Start Postgres, Redis, MinIO, OTEL, Prometheus, Grafana, Loki:

```bash
pnpm docker:dev
# or
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Services:
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO Console: `http://localhost:9001` (bizbot_minio / bizbot_minio_pass)
- Grafana: `http://localhost:3030` (admin/admin)
- Prometheus: `http://localhost:9090`
- pgAdmin (dev-tools): `http://localhost:5050` (admin@bizbot.dev/admin) — start with `--profile dev-tools`

### 4. Database Setup

Generate and apply migrations:

```bash
pnpm db:generate  # Generates Drizzle migrations
pnpm db:migrate   # Applies migrations to DB
```

Optional: Seed sample data (business, KB, menu/services):

```bash
pnpm db:seed      # Seed demo business + data
pnpm db:seed-kb   # Seed knowledge base docs with embeddings
```

Open Drizzle Studio to explore DB:

```bash
pnpm db:studio
```

### 5. Build & Run (Development)

Run all apps in dev mode (Turbo):

```bash
pnpm dev
```

Individual apps:
```bash
pnpm dev --filter=@bizbot/web
pnpm dev --filter=@bizbot/webhook-server
pnpm dev --filter=@bizbot/ai-worker
pnpm dev --filter=@bizbot/kb-server  # if running MCPs separately
```

MCP servers (run separately or via workers): each is a small Node HTTP server. AI worker calls them via HTTP.

### 6. WhatsApp Webhook Setup (Meta)

1. Go to [Meta for Developers](https://developers.facebook.com/) → WhatsApp Cloud API
2. Get `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_ACCOUNT_ID`, `WA_ACCESS_TOKEN`, `WA_APP_SECRET`
3. Set webhook URL: `https://yourdomain.com/api/webhook/whatsapp` (or ngrok for local: `ngrok http 3001`)
4. Set `WA_WEBHOOK_VERIFY_TOKEN` (must match `.env`)
5. Subscribe to webhook fields: `messages`, `message_status`

Local testing: use [ngrok](https://ngrok.com/) tunnel to expose `localhost:3001`.

## Development

### Monorepo Commands (Turbo)

| Command | Description |
|---|---|
| `pnpm dev` | Run all apps in dev mode with watch |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` | Lint all packages/apps |
| `pnpm typecheck` | Type-check all packages/apps (tsc --noEmit) |
| `pnpm test` | Run unit tests (Vitest) across all packages |
| `pnpm test:e2e` | Run Playwright E2E tests |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting |
| `pnpm clean` | Clean build artifacts + node_modules |

### Database Commands (workspace filter)

| Command | Description |
|---|---|
| `pnpm db:generate` | Generate Drizzle migrations from schema changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:push` | Push schema to DB (dev only, skips migrations) |
| `pnpm db:studio` | Open Drizzle Studio UI |
| `pnpm db:seed` | Seed demo data |
| `pnpm db:seed-kb` | Seed KB with embeddings |

### Docker Commands

| Command | Description |
|---|---|
| `pnpm docker:dev` | Start core services (dev) |
| `pnpm docker:prod` | Start with nginx + build (prod profile) |
| `pnpm docker:down` | Stop all containers |
| `pnpm docker:logs` | Tail logs from all services |

## Deployment

### Production Architecture Recommendations
- **Web (Next.js)**: Vercel, Cloudflare Pages, or Node (standalone) on ECS/K8s
- **Webhook Server + Workers + MCPs**: Railway, Render, Fly.io, ECS/Fargate, or Kubernetes
- **Postgres**: Neon (recommended), Supabase, RDS with pgvector
- **Redis**: Upstash (serverless), Redis Cloud, ElastiCache
- **Storage (R2)**: Cloudflare R2 for media/files
- **Reverse Proxy**: Nginx (included in docker-compose prod profile) + Cloudflare Tunnel/CDN
- **Observability**: Grafana Cloud/Loki/Prometheus or self-hosted

### Build for Production

```bash
pnpm build        # Turbo builds all apps/packages
pnpm start        # Start built apps (per-app start scripts)
```

Each app's `start` script runs the compiled output (e.g. `node dist/index.js` or `next start`).

### Health Checks
- Webhook: `GET /` → health (Hono app)
- MCP servers: `GET /health` → `{ ok: true, server: ... }`

## Environment Variables

Create `.env` at repo root (`Bizbot/Bizbot/.env`). Required variables grouped as below:

| Category | Variable | Required | Description |
|---|---|---|---|
| **Database** | `DATABASE_URL` | Yes | Neon PostgreSQL connection string (with `sslmode=require`) |
| **Redis** | `REDIS_URL` | Yes | Redis URL (e.g. `rediss://...` for Upstash TLS) |
| | `UPSTASH_REDIS_REST_URL` | Optional | Upstash REST URL |
| | `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash REST token |
| **WhatsApp** | `WA_PHONE_NUMBER_ID` | Yes | Meta WhatsApp Phone Number ID |
| | `WA_BUSINESS_ACCOUNT_ID` | Yes | WhatsApp Business Account ID |
| | `WA_ACCESS_TOKEN` | Yes | Permanent/system user access token |
| | `WA_WEBHOOK_VERIFY_TOKEN` | Yes | Random string for webhook verification (GET) |
| | `WA_APP_SECRET` | Yes | App secret for signature verification |
| **AI** | `ANTHROPIC_API_KEY` | Yes | Anthropic Claude API key |
| | `VOYAGE_API_KEY` | Recommended | Voyage AI embeddings API key (for RAG) |
| **Payments** | `RAZORPAY_KEY_ID` | Optional | Razorpay API key ID |
| | `RAZORPAY_KEY_SECRET` | Optional | Razorpay key secret |
| | `RAZORPAY_WEBHOOK_SECRET` | Optional | Razorpay webhook signature secret |
| **Email** | `RESEND_API_KEY` | Optional | Resend API key |
| | `RESEND_FROM_EMAIL` | Optional | From email (e.g. noreply@yourdomain.com) |
| **Auth** | `NEXTAUTH_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| | `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 in dev) |
| | `AUTH_GOOGLE_ID` | Optional | Google OAuth client ID |
| | `AUTH_GOOGLE_SECRET` | Optional | Google OAuth client secret |
| **Storage (R2)** | `R2_ACCOUNT_ID` | Optional | Cloudflare R2 account ID |
| | `R2_ACCESS_KEY_ID` | Optional | R2 access key |
| | `R2_SECRET_ACCESS_KEY` | Optional | R2 secret key |
| | `R2_BUCKET_NAME` | Optional | R2 bucket name (e.g. bizbot-media) |
| | `R2_PUBLIC_URL` | Optional | Public R2 URL |
| **Monitoring** | `SENTRY_DSN_BACKEND` | Optional | Sentry DSN for backend/services |
| | `SENTRY_DSN_WEB` | Optional | Sentry DSN for Next.js web |
| **App Config** | `NODE_ENV` | Yes | `development`/`production`/`test` |
| | `APP_URL` | Yes | Public app URL |
| | `WEBHOOK_URL` | Yes | Public webhook base URL |
| **Ports** | `PORT` | Optional | Per-app port (webhook default 3001, web 3000) |
| **MCP URLs** | `MCP_KB_URL` | Optional | Default `http://localhost:4001` |
| | `MCP_ORDER_URL` | Optional | `http://localhost:4002` |
| | `MCP_BOOKING_URL` | Optional | `http://localhost:4003` |
| | `MCP_PAYMENT_URL` | Optional | `http://localhost:4004` |
| | `MCP_CRM_URL` | Optional | `http://localhost:4005` |

See `.env.example` for full template with placeholder values.

## API Documentation

### Web Dashboard (Next.js)
- **App Router** under `apps/web/app/`
- Routes: `/login`, `/dashboard`, `/dashboard/conversations`, `/dashboard/knowledge-base`, `/dashboard/analytics`, `/dashboard/settings`, `/dashboard/onboarding`
- tRPC API handler: `apps/web/app/api/trpc/[trpc]/route.ts`

### tRPC Routers (`packages/trpc/src/routers/`)
- `dashboard` - Stats, message volume, recent conversations, model usage
- `conversations` - List, get, update status, handoff, close, send message
- `knowledgeBase` - CRUD KB docs, search, upload/process
- `analytics` - Metrics, charts, AI usage, revenue
- `settings` - Business settings, WhatsApp config, AI config, hours
- `onboarding` - Business onboarding flow, WhatsApp verification

All routers use `protectedProcedure`/`businessProcedure` with session + businessId context.

### Webhook Endpoints (Hono)

**Base**: `http://localhost:3001/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/webhook/whatsapp` | Meta webhook verification (hub.mode, hub.verify_token, hub.challenge) |
| `POST` | `/webhook/whatsapp` | Incoming WhatsApp messages + status updates (signature verified) |
| `POST` | `/webhook/razorpay` | Razorpay payment webhooks (signature verified) |
| `GET` | `/` (healthRouter) | Health check |

### MCP Tool Endpoints

Each MCP server: `POST /tools/:toolName`, `GET /health`

Example (kb-server on 4001):
```bash
curl -X POST http://localhost:4001/tools/search_knowledge_base \
  -H "Content-Type: application/json" \
  -d '{"businessId":"uuid","query":"opening hours"}'
```

Returns `{ "success": true, "result": { "results": [...] } }`

## Scripts

Root `package.json` scripts:

```json
{
  "build": "turbo build",
  "dev": "turbo dev",
  "lint": "turbo lint",
  "typecheck": "turbo typecheck",
  "test": "turbo test",
  "test:e2e": "turbo test:e2e",
  "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
  "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\"",
  "clean": "turbo clean && rm -rf node_modules",
  "db:generate": "turbo db:generate --filter=@bizbot/database",
  "db:migrate": "turbo db:migrate --filter=@bizbot/database",
  "db:studio": "turbo db:studio --filter=@bizbot/database",
  "docker:dev": "docker compose -f infrastructure/docker/docker-compose.yml up -d",
  "docker:prod": "docker compose -f infrastructure/docker/docker-compose.yml --profile prod up -d --build",
  "docker:down": "docker compose -f infrastructure/docker/docker-compose.yml down",
  "docker:logs": "docker compose -f infrastructure/docker/docker-compose.yml logs -f"
}
```

## Testing

- **Unit/Integration**: [Vitest](https://vitest.dev/) in packages/apps (`*.test.ts`, `*.spec.ts`)
- **E2E**: [Playwright](https://playwright.dev/) (`apps/web/tests/e2e/`)
- Run: `pnpm test` (unit), `pnpm test:e2e` (E2E)

## Code Quality

- **TypeScript** strict mode (per package tsconfig)
- **ESLint 9** with flat config
- **Prettier** for consistent formatting
- **Conventions**: Follow existing code style, check imports, never commit secrets
- **Comments**: None added unless explicitly requested (per project rules)

## Performance & Scalability

- **Horizontal scaling**: AI workers + MCP servers stateless; scale by increasing replicas (consumer groups distribute load)
- **Redis Streams**: Durable, replayable, backpressure via `count` + `blockMs`
- **DB**: Connection pooling via Neon serverless, indexed queries, pgvector for fast similarity
- **Caching**: Redis for business config, conversation context (TTL defined in constants)
- **Model routing**: Cost-aware (Haiku for simple, Sonnet for complex)
- **Immediate ACK to Meta**: Webhook returns 200 instantly, processing async (prevents retries)

## Security

- **Webhook signature verification**: WhatsApp (X-Hub-Signature-256, SHA256 with WA_APP_SECRET), Razorpay signature validation
- **Multi-tenant isolation**: All queries scoped by businessId
- **Secrets**: Never logged, stored in env, `.env` gitignored
- **Auth**: Auth.js v5 with secure sessions, Google OAuth
- **Headers**: Hono `secureHeaders()` middleware
- **Input validation**: Zod schemas on events, tool inputs, API inputs
- **CORS/Rate limiting**: Nginx/Cloudflare recommended in prod

## Observability

Stack (via docker-compose):
- **OpenTelemetry Collector** (4317/4318 gRPC/HTTP OTLP) → traces/metrics export
- **Prometheus** (9090) - metrics scraping
- **Grafana** (3030) - dashboards/visualization
- **Loki** (3100) - log aggregation
- **Sentry** - Error tracking (frontend/backend)

## Roadmap (Planned Phases)

See `PROJECT_PLAN.md` for full 3-phase roadmap (976 lines). Key upcoming:
- Phase 2: Order management UI, appointment calendar, broadcast messaging, CRM automation, template messages
- Phase 3: Multi-channel (Telegram, IG DMs, FB Messenger), Shopify/WooCommerce, white-label, voice messages (STT), advanced AI insights

## License

Private/Proprietary - All rights reserved (as per project state).

## Support

For issues/feedback: Report at [https://github.com/anomalyco/opencode/issues](https://github.com/anomalyco/opencode/issues) (as per agent instructions context) or contact the project maintainers.

---

**Built with ❤️ for Indian SMBs | Powered by Claude AI + WhatsApp Cloud API**