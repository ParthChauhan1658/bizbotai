# BizBot AI - WhatsApp AI Chatbot-as-a-Service

## Product Name: **BizBot AI**
> "Smart WhatsApp Assistant for Every Business"

---

## 1. PRODUCT VISION

BizBot AI lets any small/medium business deploy an AI-powered WhatsApp chatbot in under 5 minutes — no coding required. The bot handles customer queries, takes orders, books appointments, sends invoices, and provides 24/7 support — all through WhatsApp, the app their customers already use.

### Why This Will Work
- 550M+ WhatsApp users in India alone
- 95% of small businesses in India use WhatsApp for business communication
- Most can't afford custom chatbot development (5-15 lakhs)
- We offer it at 1,500-5,000/month — a no-brainer for any business owner
- AI (Claude/GPT) makes bots actually useful now, unlike old rule-based bots

---

## 2. TARGET CUSTOMERS (Priority Order)

| Segment | Pain Point | Bot Use Case | Willingness to Pay |
|---------|-----------|--------------|-------------------|
| Restaurants & Cloud Kitchens | Manual order taking via WhatsApp | Auto menu, order taking, payment links | High (saves 1-2 staff) |
| Clinics & Doctors | Appointment scheduling chaos | Auto booking, reminders, reports sharing | High |
| Salons & Spas | Missed bookings, repetitive queries | Slot booking, service catalog, reminders | Medium-High |
| Coaching Centers / Tutors | Fee collection, schedule sharing | Class schedules, fee reminders, doubt clearing | Medium |
| Real Estate Agents | Repetitive property inquiries | Property catalog, auto-qualification, site visit booking | High |
| E-commerce / D2C Brands | Order status queries flood | Order tracking, returns, product recommendations | High |
| Hotels & Homestays | Booking inquiries, check-in info | Room availability, booking, local info | Medium-High |

---

## 3. CORE FEATURES

### Phase 1 - MVP (Week 1-4)
- [ ] Multi-tenant WhatsApp Business API integration
- [ ] AI-powered conversational engine (Claude API)
- [ ] Business onboarding dashboard (web)
- [ ] Custom knowledge base per business (upload docs/FAQ/menu)
- [ ] Auto-reply with context-aware AI responses
- [ ] Basic analytics (messages sent/received, response times)
- [ ] Razorpay payment link generation in chat
- [ ] Human handoff (transfer to business owner's WhatsApp when needed)
- [ ] Multi-language support (Hindi, English, regional auto-detect)

### Phase 2 - Growth (Week 5-8)
- [ ] Appointment/booking system with calendar integration
- [ ] Order management system (for restaurants, e-commerce)
- [ ] Automated follow-ups & reminders (via WhatsApp)
- [ ] Broadcast messaging (offers, updates — within WhatsApp policy)
- [ ] CRM — customer profiles built automatically from conversations
- [ ] Template message builder (for WhatsApp approved templates)
- [ ] Catalog/menu builder with images

### Phase 3 - Scale (Week 9-16)
- [ ] Multi-channel: Telegram, Instagram DM, Facebook Messenger
- [ ] Zapier/webhook integrations
- [ ] Shopify, WooCommerce plugin
- [ ] Advanced analytics & AI insights
- [ ] White-label option for agencies
- [ ] API access for custom integrations
- [ ] Voice message processing (speech-to-text)

---

## 4. SYSTEM ARCHITECTURE

```
                                 BizBot AI - High Level Architecture
                                 ====================================

    [WhatsApp Cloud API]  [Telegram Bot API]  [Instagram API]
            |                     |                  |
            v                     v                  v
    +----------------------------------------------------------+
    |              API GATEWAY (Nginx / Cloudflare)             |
    |           Rate Limiting, SSL, DDoS Protection             |
    +----------------------------------------------------------+
            |                                        |
            v                                        v
    +-------------------+                   +-------------------+
    |   WEBHOOK SERVER  |                   |   WEB DASHBOARD   |
    |   (Node.js/Hono)  |                   |   (Next.js 14)    |
    |   - Receives msgs |                   |   - Onboarding    |
    |   - Validates     |                   |   - Analytics     |
    |   - Queues msgs   |                   |   - Settings      |
    +-------------------+                   |   - Knowledge Base|
            |                               +-------------------+
            v                                        |
    +----------------------------------------------------------+
    |                 MESSAGE QUEUE (BullMQ/Redis)              |
    |          Ensures no message is lost, handles spikes       |
    +----------------------------------------------------------+
            |
            v
    +-------------------+
    |   AI PROCESSOR    |
    |   (Worker Service)|
    |   - Fetches biz   |
    |     context       |
    |   - Calls Claude  |
    |     API           |
    |   - Generates     |
    |     response      |
    |   - Handles       |
    |     actions       |
    +-------------------+
            |
            +---> [Claude API] (AI responses)
            +---> [Razorpay API] (payment links)
            +---> [Google Calendar API] (bookings)
            |
            v
    +----------------------------------------------------------+
    |                    DATABASE LAYER                         |
    |  +----------------+  +----------+  +------------------+  |
    |  | PostgreSQL     |  | Redis    |  | S3/Cloudflare R2 |  |
    |  | - Businesses   |  | - Cache  |  | - Media files    |  |
    |  | - Conversations|  | - Queue  |  | - Documents      |  |
    |  | - Customers    |  | - Session|  | - Knowledge base |  |
    |  | - Orders       |  |          |  |                  |  |
    |  | - Appointments |  |          |  |                  |  |
    |  +----------------+  +----------+  +------------------+  |
    +----------------------------------------------------------+
```

---

## 5. TECH STACK (Advanced Production-Grade)

### Core Application
| Layer | Technology | Why |
|-------|-----------|-----|
| **Runtime** | Node.js 20 + TypeScript (strict) | Fast, huge ecosystem, perfect for I/O heavy chatbot workloads |
| **Monorepo** | Turborepo | Parallel builds, caching, workspace management |
| **Webhook Server** | Hono.js | Ultra-fast, lightweight, works everywhere (Node, Edge, Bun) |
| **Dashboard Frontend** | Next.js 15 (App Router) + React 19 | Server Components, SSR, Vercel free tier |
| **UI Components** | shadcn/ui + Tailwind CSS v4 | Beautiful, accessible, customizable |
| **API Layer** | tRPC v11 + GraphQL Yoga | Type-safe end-to-end + complex analytics queries |
| **Real-time** | Socket.io | WebSocket for live conversations, order status, notifications |
| **Validation** | Zod | Runtime + compile-time type validation everywhere |
| **Data Fetching** | TanStack Query v5 | Client-side cache, optimistic updates, real-time sync |

### Data & Infrastructure
| Layer | Technology | Why |
|-------|-----------|-----|
| **Database** | PostgreSQL 16 (Neon) + pgvector | Reliable, vector search for RAG, row-level security |
| **ORM** | Drizzle ORM | Type-safe, lightweight, fast — better than Prisma for performance |
| **Cache/Queue/Events** | Redis 7 (Upstash) + BullMQ + Redis Streams | Cache + job queues + event bus — one service, three uses |
| **File Storage** | Cloudflare R2 (prod) + MinIO (dev) | S3-compatible, no egress fees, local dev parity |
| **Containerization** | Docker + Docker Compose | Every service in a container, reproducible environments |
| **Reverse Proxy** | Nginx | Load balancing, SSL termination, rate limiting |
| **IaC** | Terraform | Infrastructure as Code for all cloud resources |
| **CI/CD** | GitHub Actions | Lint → Test → Build → Deploy pipeline with staging + prod |

### AI & Intelligence
| Layer | Technology | Why |
|-------|-----------|-----|
| **AI Engine** | Claude API (Haiku/Sonnet/Opus routing) | Best reasoning, model routing by complexity |
| **AI Tool Use** | MCP (Model Context Protocol) Servers | AI agent can call tools: orders, bookings, payments, KB search |
| **RAG Pipeline** | pgvector + text-embedding-3-small | Semantic search over business knowledge base |
| **Response Cache** | Redis (TTL-based) | Cache frequent Q&As, save AI costs |

### External Services
| Layer | Technology | Why |
|-------|-----------|-----|
| **WhatsApp** | WhatsApp Cloud API (Meta) | Free to receive, only pay per conversation |
| **Payments** | Razorpay | Best for India, subscriptions + payment links |
| **Auth** | Auth.js v5 (NextAuth) | JWT + sessions, Google + Email + OTP |
| **Email** | Resend (3000/month free) | Transactional emails, invoices |
| **DNS/CDN/WAF** | Cloudflare (free) | DDoS, WAF, SSL, CDN, R2 |
| **Hosting - Frontend** | Vercel (free tier) | Perfect for Next.js |
| **Hosting - Backend** | Railway.app | Docker container hosting, auto-deploy |

### Observability & Testing
| Layer | Technology | Why |
|-------|-----------|-----|
| **Tracing** | OpenTelemetry + Tempo | Distributed traces across all microservices |
| **Metrics** | Prometheus + Grafana | Custom dashboards for message throughput, AI latency, errors |
| **Logging** | Loki (via OpenTelemetry) | Centralized log aggregation with trace correlation |
| **Error Tracking** | Sentry | Error monitoring with session replay |
| **Uptime** | BetterStack | Uptime monitoring + alerting |
| **Unit Tests** | Vitest | Fast, TypeScript-native test runner |
| **Integration Tests** | Testcontainers | Real PostgreSQL + Redis in Docker for tests |
| **E2E Tests** | Playwright | Browser-based dashboard testing |

### Architecture Patterns
| Pattern | Implementation |
|---------|---------------|
| **Microservices** | 8 Docker containers (web, webhook, ai-worker, order, booking, notify, billing, analytics) |
| **Event-Driven** | Redis Streams as event bus, consumer groups for each service |
| **MCP Tool Servers** | 5 MCP servers (order, booking, payment, KB, CRM) — AI calls them as tools |
| **CQRS-lite** | Write to primary DB, analytics reads from read replica |
| **RAG** | Embed → Vector search → Re-rank → Inject into prompt |
| **State Machines** | Order lifecycle, booking lifecycle, subscription lifecycle |
| **Circuit Breaker** | Graceful degradation when Claude API / Razorpay is down |

---

## 6. DATABASE SCHEMA (Core Tables)

```sql
-- ========================
-- MULTI-TENANT CORE
-- ========================

-- Business accounts (our customers)
CREATE TABLE businesses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    owner_name      VARCHAR(255) NOT NULL,
    owner_email     VARCHAR(255) UNIQUE NOT NULL,
    owner_phone     VARCHAR(20) NOT NULL,
    business_type   VARCHAR(50) NOT NULL, -- restaurant, clinic, salon, etc.

    -- WhatsApp Config
    wa_phone_number_id  VARCHAR(50),
    wa_business_account_id VARCHAR(50),
    wa_access_token     TEXT, -- encrypted
    wa_webhook_verify_token VARCHAR(100),
    wa_connected        BOOLEAN DEFAULT FALSE,

    -- AI Config
    system_prompt       TEXT, -- custom AI personality/instructions
    ai_model           VARCHAR(50) DEFAULT 'claude-sonnet-4-6',
    ai_temperature     DECIMAL(2,1) DEFAULT 0.7,
    max_tokens_per_reply INT DEFAULT 500,

    -- Business Settings
    business_hours     JSONB, -- {"mon": {"open": "09:00", "close": "18:00"}, ...}
    auto_reply_outside_hours TEXT,
    default_language   VARCHAR(10) DEFAULT 'en',
    supported_languages VARCHAR(50)[] DEFAULT '{en,hi}',

    -- Subscription
    plan            VARCHAR(20) DEFAULT 'trial', -- trial, starter, pro, enterprise
    plan_expires_at TIMESTAMPTZ,
    razorpay_customer_id VARCHAR(50),
    razorpay_subscription_id VARCHAR(50),

    -- Limits
    monthly_message_limit INT DEFAULT 1000,
    messages_used_this_month INT DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);

-- End customers (people messaging the business on WhatsApp)
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    wa_id           VARCHAR(20) NOT NULL, -- WhatsApp phone number
    name            VARCHAR(255),
    email           VARCHAR(255),
    phone           VARCHAR(20),
    language        VARCHAR(10) DEFAULT 'en',
    tags            VARCHAR(50)[] DEFAULT '{}',
    metadata        JSONB DEFAULT '{}', -- flexible customer data
    first_message_at TIMESTAMPTZ,
    last_message_at  TIMESTAMPTZ,
    total_messages   INT DEFAULT 0,
    is_blocked       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(business_id, wa_id)
);

-- Conversations (group messages into sessions)
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
    status          VARCHAR(20) DEFAULT 'active', -- active, closed, handed_off
    handed_off_to   VARCHAR(255), -- phone/name of human agent
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    message_count   INT DEFAULT 0,
    summary         TEXT, -- AI-generated conversation summary
    sentiment       VARCHAR(20), -- positive, neutral, negative
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Individual messages
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id),

    direction       VARCHAR(10) NOT NULL, -- inbound, outbound
    message_type    VARCHAR(20) NOT NULL, -- text, image, audio, video, document, location, template
    content         TEXT, -- text content
    media_url       TEXT, -- URL for media messages
    media_mime_type VARCHAR(50),

    -- WhatsApp specific
    wa_message_id   VARCHAR(100) UNIQUE,
    wa_status       VARCHAR(20), -- sent, delivered, read, failed
    wa_timestamp    TIMESTAMPTZ,

    -- AI specific
    ai_generated    BOOLEAN DEFAULT FALSE,
    ai_tokens_used  INT DEFAULT 0,
    ai_cost         DECIMAL(10,6) DEFAULT 0,

    -- Action tracking
    action_type     VARCHAR(50), -- payment_link, booking, order, handoff
    action_data     JSONB,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- KNOWLEDGE BASE
-- ========================

-- Business knowledge base documents
CREATE TABLE knowledge_base (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    title           VARCHAR(255) NOT NULL,
    content         TEXT NOT NULL, -- raw text content
    content_type    VARCHAR(20) NOT NULL, -- faq, menu, catalog, policy, custom
    embedding       VECTOR(1536), -- for semantic search (pgvector)
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ORDERS & BOOKINGS
-- ========================

-- Orders (restaurants, e-commerce)
CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),

    order_number    VARCHAR(20) NOT NULL,
    items           JSONB NOT NULL, -- [{name, qty, price}]
    subtotal        DECIMAL(10,2) NOT NULL,
    tax             DECIMAL(10,2) DEFAULT 0,
    total           DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'INR',

    status          VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivered, cancelled
    payment_status  VARCHAR(20) DEFAULT 'unpaid', -- unpaid, paid, refunded
    razorpay_payment_link_id VARCHAR(50),
    razorpay_payment_id VARCHAR(50),

    delivery_address TEXT,
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments/Bookings (clinics, salons)
CREATE TABLE appointments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id     UUID REFERENCES customers(id),
    conversation_id UUID REFERENCES conversations(id),

    service_name    VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    duration_mins   INT NOT NULL,

    status          VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, completed, cancelled, no_show
    payment_status  VARCHAR(20) DEFAULT 'unpaid',
    amount          DECIMAL(10,2),
    razorpay_payment_link_id VARCHAR(50),

    reminder_sent   BOOLEAN DEFAULT FALSE,
    notes           TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Services catalog (for salons, clinics, etc.)
CREATE TABLE services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    duration_mins   INT NOT NULL,
    price           DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'INR',
    category        VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Menu items (for restaurants)
CREATE TABLE menu_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'INR',
    category        VARCHAR(100), -- starters, mains, drinks, etc.
    image_url       TEXT,
    is_vegetarian   BOOLEAN DEFAULT FALSE,
    is_available    BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ========================
-- ANALYTICS & BILLING
-- ========================

-- Daily analytics per business
CREATE TABLE daily_analytics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    messages_received INT DEFAULT 0,
    messages_sent    INT DEFAULT 0,
    unique_customers INT DEFAULT 0,
    new_customers    INT DEFAULT 0,
    orders_placed    INT DEFAULT 0,
    orders_revenue   DECIMAL(10,2) DEFAULT 0,
    appointments_booked INT DEFAULT 0,
    avg_response_time_ms INT DEFAULT 0,
    ai_tokens_used   INT DEFAULT 0,
    ai_cost          DECIMAL(10,4) DEFAULT 0,

    UNIQUE(business_id, date)
);

-- Subscription & billing
CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
    amount          DECIMAL(10,2) NOT NULL,
    currency        VARCHAR(3) DEFAULT 'INR',
    status          VARCHAR(20) DEFAULT 'pending', -- pending, paid, failed, refunded
    razorpay_invoice_id VARCHAR(50),
    razorpay_payment_id VARCHAR(50),
    billing_period_start DATE,
    billing_period_end DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    paid_at         TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_business ON messages(business_id, created_at);
CREATE INDEX idx_customers_business_wa ON customers(business_id, wa_id);
CREATE INDEX idx_conversations_business ON conversations(business_id, status);
CREATE INDEX idx_orders_business ON orders(business_id, created_at);
CREATE INDEX idx_appointments_business_date ON appointments(business_id, appointment_date);
CREATE INDEX idx_knowledge_base_business ON knowledge_base(business_id, is_active);
CREATE INDEX idx_daily_analytics_business ON daily_analytics(business_id, date);
```

---

## 7. API DESIGN (Key Endpoints)

### Webhook (WhatsApp)
```
POST /api/webhook/whatsapp          — Receive incoming messages from WhatsApp
GET  /api/webhook/whatsapp          — Webhook verification (Meta challenge)
```

### Auth
```
POST /api/auth/signup               — Register new business
POST /api/auth/login                — Login
POST /api/auth/forgot-password      — Password reset
GET  /api/auth/session              — Get current session
```

### Business Dashboard
```
GET    /api/business/profile        — Get business profile
PUT    /api/business/profile        — Update business profile
POST   /api/business/connect-whatsapp — Connect WhatsApp Business Account
PUT    /api/business/ai-settings    — Update AI personality/settings
```

### Knowledge Base
```
GET    /api/knowledge-base          — List all KB entries
POST   /api/knowledge-base          — Add new KB entry (FAQ, menu, etc.)
PUT    /api/knowledge-base/:id      — Update KB entry
DELETE /api/knowledge-base/:id      — Delete KB entry
POST   /api/knowledge-base/upload   — Upload document (PDF, CSV) to KB
```

### Conversations & Messages
```
GET    /api/conversations           — List conversations (with filters)
GET    /api/conversations/:id       — Get conversation with messages
POST   /api/conversations/:id/handoff — Transfer to human
POST   /api/conversations/:id/reply — Manual reply from dashboard
```

### Customers
```
GET    /api/customers               — List customers
GET    /api/customers/:id           — Customer profile + history
PUT    /api/customers/:id           — Update customer tags/notes
POST   /api/customers/broadcast     — Send broadcast message
```

### Orders
```
GET    /api/orders                  — List orders
GET    /api/orders/:id              — Order details
PUT    /api/orders/:id/status       — Update order status
```

### Appointments
```
GET    /api/appointments            — List appointments
GET    /api/appointments/:id        — Appointment details
PUT    /api/appointments/:id/status — Update appointment status
GET    /api/appointments/slots      — Available slots
```

### Analytics
```
GET    /api/analytics/overview      — Dashboard stats
GET    /api/analytics/messages      — Message analytics
GET    /api/analytics/customers     — Customer analytics
GET    /api/analytics/revenue       — Revenue analytics
```

### Billing
```
GET    /api/billing/plans           — Available plans
POST   /api/billing/subscribe       — Subscribe to plan
GET    /api/billing/invoices        — List invoices
POST   /api/billing/webhook         — Razorpay payment webhook
```

---

## 8. AI CONVERSATION FLOW

```
Customer sends message on WhatsApp
        |
        v
[Webhook receives message]
        |
        v
[Identify business by phone_number_id]
        |
        v
[Find or create customer record]
        |
        v
[Find or create conversation]
        |
        v
[Check business hours] ---> Outside hours? ---> Send auto-reply
        |
        v (within hours)
[Check message limit] ---> Exceeded? ---> Notify business owner
        |
        v
[Load context for AI]:
  - Business system prompt (personality)
  - Knowledge base (RAG - semantic search)
  - Last 10 messages in conversation
  - Customer profile & history
  - Available actions (order, book, pay)
        |
        v
[Call Claude API with context]
        |
        v
[Parse AI response for actions]:
  - Contains order? --> Create order + payment link
  - Contains booking? --> Check slots + create appointment
  - Contains payment? --> Generate Razorpay link
  - Contains handoff? --> Transfer to human
  - Plain reply? --> Send as text
        |
        v
[Send response via WhatsApp Cloud API]
        |
        v
[Update analytics & conversation]
```

---

## 9. PRICING STRATEGY

| Plan | Price/month | Messages | Features |
|------|------------|----------|----------|
| **Trial** | FREE (14 days) | 200 messages | Basic AI chat, 1 KB doc |
| **Starter** | Rs 1,499/mo | 2,000 messages | AI chat, KB (10 docs), orders OR bookings, basic analytics |
| **Pro** | Rs 2,999/mo | 5,000 messages | Everything in Starter + CRM, broadcasts, advanced analytics, priority support |
| **Business** | Rs 4,999/mo | 15,000 messages | Everything in Pro + multi-language, API access, custom integrations, white-label |
| **Enterprise** | Custom | Unlimited | Everything + dedicated support, SLA, custom AI training |

**Add-ons:**
- Extra 1,000 messages: Rs 299
- Extra WhatsApp number: Rs 999/mo
- Priority AI (faster model): Rs 499/mo

---

## 10. COST BREAKDOWN (Monthly at Scale)

### Phase 1: MVP (0-50 businesses)

| Item | Cost/month | Notes |
|------|-----------|-------|
| Neon PostgreSQL | Rs 0 | Free tier (0.5 GB) |
| Upstash Redis | Rs 0 | Free tier (10K commands/day) |
| Vercel (Frontend) | Rs 0 | Free tier |
| Railway (Backend) | Rs 420 ($5) | Hobby plan |
| Cloudflare R2 | Rs 0 | Free tier (10 GB) |
| Claude API | Rs 2,000-4,000 | ~50K messages @ Haiku for most, Sonnet for complex |
| WhatsApp Cloud API | Rs 0-1,000 | First 1000 conversations/month free |
| Razorpay | 2% per txn | No fixed cost |
| Domain | Rs 800/year | .in domain |
| Resend (Email) | Rs 0 | Free tier |
| **TOTAL** | **Rs 3,000-5,500/mo** | |

### Revenue at 50 businesses (conservative):
- 30 Starter (Rs 1,499) = Rs 44,970
- 15 Pro (Rs 2,999) = Rs 44,985
- 5 Business (Rs 4,999) = Rs 24,995
- **Monthly Revenue = Rs 1,14,950**
- **Monthly Profit = ~Rs 1,09,000+**

### Initial Investment (One-time):
| Item | Cost |
|------|------|
| Domain (.in) | Rs 500-800 |
| Meta Business Verification | Rs 0 (free) |
| Razorpay Account | Rs 0 (free) |
| SSL / Cloudflare | Rs 0 (free) |
| Development | Rs 0 (we build it together!) |
| **TOTAL ONE-TIME** | **Rs 500-800** |

---

## 11. GO-TO-MARKET STRATEGY

### Month 1: Build + Get 5 Pilot Customers
- Build MVP
- Offer FREE to 5 local businesses (restaurants, salons near you)
- Get feedback, iterate
- Create demo video

### Month 2: Get to 20 Customers
- Create landing page with demo video
- Post on LinkedIn, Twitter, local business WhatsApp groups
- Offer first month free promotion
- Join IndieHackers, Product Hunt
- Local networking (visit businesses in person)

### Month 3: Get to 50+ Customers
- Start Google Ads (WhatsApp chatbot for restaurants, etc.)
- Partner with Razorpay/payment gateway affiliate programs
- Create YouTube tutorial content
- Referral program: Rs 500 credit for each referral
- List on SaaS directories

### Month 4+: Scale
- Hire 1 sales person (commission-based)
- Agency/reseller partnerships
- Content marketing + SEO
- Expand to new verticals & cities

---

## 12. PROJECT STRUCTURE

```
bizbot-ai/
├── apps/
│   ├── web/                        # Next.js 15 Dashboard + tRPC + GraphQL
│   │   ├── app/
│   │   │   ├── (auth)/             # Login, signup, forgot-password
│   │   │   ├── (dashboard)/        # Main dashboard layout
│   │   │   │   ├── conversations/  # Real-time chat viewer (Socket.io)
│   │   │   │   ├── customers/      # CRM with profiles, tags, history
│   │   │   │   ├── orders/         # Order management + state tracking
│   │   │   │   ├── appointments/   # Calendar view + slot management
│   │   │   │   ├── knowledge-base/ # KB editor + document upload
│   │   │   │   ├── analytics/      # Charts (Recharts) + GraphQL queries
│   │   │   │   ├── broadcasts/     # Bulk WhatsApp messaging
│   │   │   │   ├── settings/       # AI config, business hours, languages
│   │   │   │   └── billing/        # Plans, invoices, usage meter
│   │   │   ├── api/
│   │   │   │   ├── trpc/           # tRPC HTTP handler
│   │   │   │   ├── graphql/        # GraphQL Yoga endpoint
│   │   │   │   └── auth/           # Auth.js route handlers
│   │   │   └── layout.tsx
│   │   ├── components/             # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── trpc.ts            # tRPC client setup
│   │   │   ├── socket.ts          # Socket.io client
│   │   │   └── utils.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── webhook-server/             # Hono.js — WhatsApp/Telegram webhooks
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── whatsapp.ts    # Meta webhook handler
│   │   │   │   ├── telegram.ts    # Telegram webhook handler
│   │   │   │   └── health.ts     # Health check endpoint
│   │   │   ├── middleware/
│   │   │   │   ├── signature.ts   # HMAC verification
│   │   │   │   └── rate-limit.ts  # Per-business rate limiting
│   │   │   ├── parsers/           # Message type parsers
│   │   │   ├── index.ts
│   │   │   └── instrumentation.ts # OpenTelemetry setup
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── ai-worker/                  # AI Processing Service
│   │   ├── src/
│   │   │   ├── consumer.ts        # Redis Stream consumer
│   │   │   ├── context-builder.ts # Builds full AI context
│   │   │   ├── model-router.ts    # Routes to Haiku/Sonnet/Opus
│   │   │   ├── mcp-host.ts        # MCP client — connects to tool servers
│   │   │   ├── rag/
│   │   │   │   ├── embedder.ts    # Text embedding pipeline
│   │   │   │   ├── retriever.ts   # pgvector similarity search
│   │   │   │   └── reranker.ts    # Re-rank results by relevance
│   │   │   ├── cache.ts           # Redis response cache
│   │   │   └── instrumentation.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── order-worker/               # Order lifecycle service
│   │   ├── src/
│   │   │   ├── consumer.ts        # Redis Stream consumer for order.*
│   │   │   ├── state-machine.ts   # Order state transitions
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── booking-worker/             # Booking lifecycle service
│   │   ├── src/
│   │   │   ├── consumer.ts        # Redis Stream consumer for booking.*
│   │   │   ├── slot-engine.ts     # Availability calculator
│   │   │   ├── reminder.ts        # BullMQ delayed job scheduler
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── notification-worker/        # Multi-channel notification service
│   │   ├── src/
│   │   │   ├── consumer.ts        # Consumes message.send + status events
│   │   │   ├── channels/
│   │   │   │   ├── whatsapp.ts    # WhatsApp Cloud API sender
│   │   │   │   ├── email.ts       # Resend email sender
│   │   │   │   └── websocket.ts   # Socket.io push to dashboard
│   │   │   ├── templates/         # WhatsApp message templates
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── billing-worker/             # Subscription & usage tracking
│   │   ├── src/
│   │   │   ├── razorpay-webhook.ts # Razorpay event handler
│   │   │   ├── subscription.ts     # Lifecycle manager
│   │   │   ├── usage-tracker.ts    # Message count enforcement
│   │   │   └── invoice.ts          # Invoice generation
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── analytics-worker/           # Metrics aggregation service
│       ├── src/
│       │   ├── consumer.ts         # Consumes ALL events
│       │   ├── aggregator.ts       # Hourly/daily/monthly rollups
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
│
├── mcp-servers/                    # MCP Tool Servers (AI agent tools)
│   ├── order-server/              # Tools: search_menu, create_order, etc.
│   │   ├── src/
│   │   │   ├── tools/
│   │   │   │   ├── search-menu.ts
│   │   │   │   ├── create-order.ts
│   │   │   │   ├── update-order.ts
│   │   │   │   └── get-order.ts
│   │   │   └── index.ts
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── booking-server/            # Tools: check_availability, create_appointment, etc.
│   │   ├── src/tools/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── payment-server/            # Tools: create_payment_link, check_status, etc.
│   │   ├── src/tools/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   ├── kb-server/                 # Tools: search_kb, get_business_info, etc.
│   │   ├── src/tools/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── crm-server/                # Tools: get_customer_profile, get_history, etc.
│       ├── src/tools/
│       ├── Dockerfile
│       └── package.json
│
├── packages/                       # Shared packages (Turborepo workspaces)
│   ├── database/                   # Drizzle schema + migrations
│   │   ├── schema/
│   │   │   ├── businesses.ts
│   │   │   ├── customers.ts
│   │   │   ├── conversations.ts
│   │   │   ├── messages.ts
│   │   │   ├── orders.ts
│   │   │   ├── appointments.ts
│   │   │   ├── knowledge-base.ts
│   │   │   ├── analytics.ts
│   │   │   └── billing.ts
│   │   ├── migrations/
│   │   ├── drizzle.config.ts
│   │   └── index.ts
│   │
│   ├── events/                    # Event types + Redis Stream helpers
│   │   ├── types.ts               # All event type definitions
│   │   ├── producer.ts            # Emit events to streams
│   │   ├── consumer.ts            # Consumer group helpers
│   │   └── index.ts
│   │
│   ├── shared/                    # Shared types, utils, constants
│   │   ├── types/
│   │   ├── utils/
│   │   ├── constants.ts
│   │   └── index.ts
│   │
│   ├── ai-prompts/                # System prompts per business type
│   │   ├── templates/
│   │   │   ├── restaurant.ts
│   │   │   ├── clinic.ts
│   │   │   ├── salon.ts
│   │   │   ├── ecommerce.ts
│   │   │   └── base.ts
│   │   ├── few-shots/             # Few-shot examples per vertical
│   │   └── index.ts
│   │
│   └── trpc/                      # tRPC router definitions
│       ├── routers/
│       │   ├── business.ts
│       │   ├── conversation.ts
│       │   ├── customer.ts
│       │   ├── order.ts
│       │   ├── appointment.ts
│       │   ├── knowledge-base.ts
│       │   ├── analytics.ts
│       │   └── billing.ts
│       ├── context.ts
│       └── index.ts
│
├── infrastructure/                 # IaC + Docker + Nginx
│   ├── docker/
│   │   ├── docker-compose.yml     # Full local dev environment
│   │   ├── docker-compose.prod.yml
│   │   └── nginx/
│   │       ├── nginx.conf         # Reverse proxy config
│   │       └── Dockerfile
│   ├── terraform/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   ├── environments/
│   │   │   ├── staging.tfvars
│   │   │   └── production.tfvars
│   │   └── modules/
│   │       ├── neon-db/
│   │       ├── upstash-redis/
│   │       ├── cloudflare/
│   │       └── railway/
│   └── grafana/
│       └── dashboards/            # Pre-built Grafana dashboards
│           ├── messages.json
│           ├── ai-performance.json
│           └── business-metrics.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Lint + Test + Build
│       ├── cd-staging.yml         # Deploy to staging
│       └── cd-production.yml      # Deploy to production
│
├── turbo.json                     # Turborepo config
├── package.json                   # Root workspace
├── tsconfig.base.json             # Shared TS config
├── .env.example
└── CLAUDE.md                      # Project conventions for AI
```

---

## 13. DEVELOPMENT PHASES & TIMELINE

### Week 1: Foundation
- [ ] Project setup (monorepo, TypeScript, ESLint)
- [ ] Database schema + Drizzle ORM setup
- [ ] Auth system (NextAuth.js)
- [ ] Business onboarding flow
- [ ] WhatsApp Cloud API integration (send/receive messages)

### Week 2: AI Core
- [ ] AI conversation engine with Claude
- [ ] Knowledge base CRUD + document upload
- [ ] RAG (Retrieval Augmented Generation) for KB search
- [ ] System prompts per business type
- [ ] Message queue (BullMQ) for reliable processing

### Week 3: Business Features
- [ ] Order management system
- [ ] Appointment booking system
- [ ] Razorpay payment link integration
- [ ] Human handoff system
- [ ] Auto-reply outside business hours

### Week 4: Dashboard & Polish
- [ ] Conversation viewer (real-time)
- [ ] Customer CRM view
- [ ] Analytics dashboard
- [ ] Billing & subscription (Razorpay subscriptions)
- [ ] Landing page
- [ ] Testing & bug fixes
- [ ] Deploy to production

---

## 14. COMPETITIVE ADVANTAGE

1. **AI-First**: Not rule-based like competitors (WATI, AiSensy) — actually understands context
2. **India-First Pricing**: 10x cheaper than international alternatives
3. **Vertical Templates**: Pre-built for restaurants, clinics, salons — works in 5 minutes
4. **Hindi + Regional Languages**: Most competitors are English-only
5. **Built-in Payments**: Razorpay integration means businesses can collect money IN the chat
6. **No-Code Setup**: Business owners don't need technical knowledge

---

## 15. RISKS & MITIGATIONS

| Risk | Mitigation |
|------|-----------|
| WhatsApp API policy changes | Multi-channel support (Telegram, Instagram as backup) |
| AI costs spike | Use Haiku for simple queries, Sonnet only for complex; cache frequent responses |
| Slow customer acquisition | Start with free tier, local networking, referrals |
| Competition (WATI, Interakt) | AI differentiation, India-first pricing, better UX |
| Data privacy concerns | All data encrypted, GDPR/Indian IT Act compliance, clear privacy policy |

---

*This is your business. Let's build it.*
