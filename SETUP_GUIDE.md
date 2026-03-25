# BizBot AI — Complete Setup Guide

## What You Already Have
- [x] Node.js v24.14.0
- [x] npm v11.9.0
- [x] Git v2.53.0
- [x] pnpm v10.32.1

---

## STEP 1: Install Docker Desktop (Windows 11)

Docker lets us run PostgreSQL, Redis, Nginx, Grafana, and all microservices in containers.

### 1.1 Download & Install Docker Desktop
1. Go to: https://www.docker.com/products/docker-desktop/
2. Click **"Download for Windows"**
3. Run the installer (default settings are fine — it auto-picks the best backend)
4. **Restart your PC** after installation

### 1.2 Verify Docker
Open a new terminal and run:
```bash
docker --version
docker compose version
```
Both should show version numbers.

### 1.3 Docker Settings (Recommended)
Open Docker Desktop → Settings → Resources:
- **Memory**: Set to at least 4 GB (8 GB recommended)
- **CPUs**: Set to at least 2

---

## STEP 2: Install pnpm (Already Installed - v10.32.1)
You already have pnpm. Skip this.

---

## STEP 3: Create Free Accounts (All Free - No Credit Card)

### 3.1 GitHub (You probably have this)
- https://github.com
- Create a new repository: `bizbot-ai` (private)

### 3.2 Neon (PostgreSQL Database - Free)
1. Go to: https://neon.tech
2. Sign up with GitHub
3. Create a project: **bizbot-ai**
4. Region: **Asia (Singapore)** — ap-southeast-1
5. Copy the connection string — looks like:
   ```
   postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
6. **Save this** — we'll need it as `DATABASE_URL`

### 3.3 Upstash (Redis - Free)
1. Go to: https://upstash.com
2. Sign up with GitHub
3. Create a Redis database:
   - Name: **bizbot-redis**
   - Region: **Asia Pacific (Singapore)**
   - Enable **Eviction** (for cache)
4. Copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
   - `REDIS_URL` (the ioredis connection string)

### 3.4 Cloudflare (DNS + R2 Storage - Free)
1. Go to: https://dash.cloudflare.com/sign-up
2. Sign up
3. Later we'll add your domain here
4. Go to **R2** → Create bucket: **bizbot-media**
5. Copy R2 credentials (Account ID, Access Key, Secret Key)

### 3.5 Meta Developer Account (WhatsApp Cloud API - Free)
1. Go to: https://developers.facebook.com
2. Log in with your Facebook account (create one if needed)
3. Click **"My Apps"** → **"Create App"**
4. Select **"Business"** → App name: **BizBot AI**
5. Add product: **WhatsApp**
6. You'll get:
   - **Phone Number ID** (test number)
   - **WhatsApp Business Account ID**
   - **Temporary Access Token** (valid 24h, we'll get permanent later)
7. Note the **test phone number** they give you (for development)
8. Add your personal phone number as a recipient (for testing)

### 3.6 Anthropic (Claude API - Pay-as-you-go)
1. Go to: https://console.anthropic.com
2. Sign up
3. Go to **API Keys** → Create key: **bizbot-production**
4. Add $5 credits (minimum) — this will last months during development
5. Copy the API key: `sk-ant-...`

### 3.7 Razorpay (Payments - Free to Sign Up)
1. Go to: https://dashboard.razorpay.com/signup
2. Sign up with email
3. Start in **Test Mode** (no real money)
4. Go to **Settings → API Keys** → Generate Test Keys
5. Copy:
   - `RAZORPAY_KEY_ID` (starts with `rzp_test_`)
   - `RAZORPAY_KEY_SECRET`
6. KYC/verification needed later for live mode

### 3.8 Resend (Email - Free 3000/month)
1. Go to: https://resend.com
2. Sign up with GitHub
3. Go to **API Keys** → Create: **bizbot**
4. Copy: `RESEND_API_KEY`

### 3.9 Vercel (Frontend Hosting - Free)
1. Go to: https://vercel.com
2. Sign up with GitHub
3. We'll connect the repo later during deployment

### 3.10 Railway (Backend Hosting - $5/month)
1. Go to: https://railway.app
2. Sign up with GitHub
3. We'll deploy containers here later

### 3.11 Sentry (Error Tracking - Free)
1. Go to: https://sentry.io
2. Sign up with GitHub
3. Create project: **bizbot-ai** (Node.js)
4. Copy: `SENTRY_DSN`

### 3.12 BetterStack (Uptime Monitoring - Free)
1. Go to: https://betterstack.com
2. Sign up
3. We'll add monitors later after deployment

---

## STEP 4: Buy a Domain (One-Time Rs 500-800)

**Recommended registrars:**
- https://www.namecheap.com (~Rs 800/year for .com)
- https://www.cloudflare.com/products/registrar/ (cheapest, at-cost pricing)

**Suggested names:**
- bizbot.in
- bizbotai.in
- bizbot.co.in
- getbizbot.com

After purchase, point nameservers to Cloudflare (we'll do this together).

> NOTE: You can skip this for now and use Vercel's free `.vercel.app` subdomain during development.

---

## STEP 5: Environment Variables Template

After creating all accounts, you'll have these values. Create a `.env` file:

```env
# ===========================
# DATABASE
# ===========================
DATABASE_URL=postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# ===========================
# REDIS
# ===========================
REDIS_URL=rediss://default:xxx@apn1-xxx.upstash.io:6379
UPSTASH_REDIS_REST_URL=https://apn1-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ===========================
# WHATSAPP (Meta Cloud API)
# ===========================
WA_PHONE_NUMBER_ID=your_phone_number_id
WA_BUSINESS_ACCOUNT_ID=your_business_account_id
WA_ACCESS_TOKEN=your_access_token
WA_WEBHOOK_VERIFY_TOKEN=any_random_string_you_choose
WA_APP_SECRET=your_app_secret

# ===========================
# AI (Anthropic Claude)
# ===========================
ANTHROPIC_API_KEY=sk-ant-xxx

# ===========================
# PAYMENTS (Razorpay)
# ===========================
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# ===========================
# EMAIL (Resend)
# ===========================
RESEND_API_KEY=re_xxx

# ===========================
# AUTH
# ===========================
NEXTAUTH_SECRET=run_openssl_rand_base64_32
NEXTAUTH_URL=http://localhost:3000

# ===========================
# STORAGE (Cloudflare R2)
# ===========================
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=bizbot-media
R2_PUBLIC_URL=https://media.bizbot.in

# ===========================
# MONITORING
# ===========================
SENTRY_DSN=https://xxx@sentry.io/xxx

# ===========================
# APP
# ===========================
NODE_ENV=development
APP_URL=http://localhost:3000
WEBHOOK_URL=http://localhost:3001
```

---

## STEP 6: Checklist Before We Start Coding

### Must Have (before coding):
- [ ] Docker Desktop installed & running
- [ ] GitHub account + empty `bizbot-ai` repo created
- [ ] Neon account + project created (get DATABASE_URL)
- [ ] Upstash account + Redis created (get REDIS_URL)
- [ ] Meta Developer account + WhatsApp app created (get tokens)
- [ ] Anthropic account + API key (add $5 credits)
- [ ] Razorpay account + test API keys

### Can Do Later (not needed for Week 1):
- [ ] Cloudflare account + R2 bucket (needed Week 2)
- [ ] Resend account (needed Week 3)
- [ ] Vercel account (needed Week 4)
- [ ] Railway account (needed Week 4)
- [ ] Sentry account (needed Week 4)
- [ ] BetterStack account (needed Week 4)
- [ ] Domain purchase (needed Week 4)

---

## Estimated Time for Setup
| Task | Time |
|------|------|
| Install Docker Desktop + WSL2 | 20-30 mins (includes restarts) |
| Create all free accounts | 30-40 mins |
| Get all API keys | 15-20 mins |
| Total | ~1 hour |

---

## What's Next?
Once Docker is running and you have at least the "Must Have" accounts:
1. We initialize the Turborepo monorepo
2. Set up Docker Compose (PostgreSQL + Redis + Nginx locally)
3. Create the database schema
4. Build the first microservice (webhook server)
5. Send/receive your first WhatsApp message through the bot!
