# Examify — Scaling Guide

How to grow Examify from launch to 1 million users, with realistic cost projections at each stage.

---

## Growth Stages

```
Stage 1:  0 → 1,000 users      (Launch — "Do things that don't scale")
Stage 2:  1K → 10K users       (Product-market fit validation)
Stage 3:  10K → 100K users     (Growth engine running)
Stage 4:  100K → 1M users      (Scale infrastructure)
```

---

## Stage 1: 0 → 1,000 Users

**Infrastructure:** Everything on free tiers. No optimization needed.

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway (backend) | Free tier | $0 |
| Supabase | Free tier (500MB DB, 1GB storage) | $0 |
| Upstash Redis | Free tier (10K req/day) | $0 |
| Expo EAS | Free tier | $0 |
| **Total** | | **$0** |

**Focus:** Get your first 100 real users. Talk to them. Find out exactly why they use the app and what frustrates them.

**Key action:** Manually score the first 100 writing responses yourself in addition to AI scoring. Validate the AI scores against your own assessment. This builds trust with early users.

---

## Stage 2: 1K → 10K Users

**Infrastructure upgrades needed:**

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway (backend) | Hobby $5/mo | $5 |
| Supabase | Pro $25/mo | $25 |
| Upstash Redis | Pay-as-you-go ~$1 | $1 |
| AI costs (Claude + Whisper) | ~$0.01/writing score, ~$0.05/speaking | ~$100 |
| **Total** | | **~$131/mo** |

**With 500 Pro subscribers at $7.99/month = $3,995 MRR**
This stage should be profitable.

**Technical changes:**
- Add database connection pooling (PgBouncer — built into Supabase Pro)
- Add Redis caching for exam lists and leaderboard (reduces DB queries by ~70%)
- Set up AI response queuing to avoid timeout issues during traffic spikes

---

## Stage 3: 10K → 100K Users

**Infrastructure:**

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway (backend) | Scale plan — 2 replicas | $40 |
| Supabase | Pro + compute add-ons | $100 |
| Upstash Redis | $20/mo | $20 |
| CDN (Cloudflare) | Free tier | $0 |
| AI costs | ~$2,000/mo | $2,000 |
| Monitoring (Sentry, PostHog) | ~$100/mo | $100 |
| **Total** | | **~$2,260/mo** |

**With 5,000 Pro subscribers at $7.99/month = $39,950 MRR**
Healthy margins.

**Technical changes needed:**

1. **Horizontal scaling:** Run 2-3 backend instances behind Railway's load balancer
2. **Database read replicas:** Supabase Pro includes read replicas — route analytics/reporting queries there
3. **AI result caching:** Cache identical AI scores for identical essays (hash the text) — saves ~30% on AI costs
4. **CDN for audio files:** Move Supabase Storage → Cloudflare R2 + CDN for lower-latency audio globally
5. **Background jobs:** Move AI scoring to a proper job queue (Bull + Redis) to handle bursts
6. **Question bank CDN:** Serve question assets from CDN edge nodes close to users

```javascript
// Example: Cache AI scores by content hash
const crypto = require('crypto');
const contentHash = crypto.createHash('sha256').update(user_answer).digest('hex');
const cacheKey = `ai_writing:${exam_type}:${contentHash}`;

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Generate fresh score
const score = await aiService.scoreIELTSWriting({ ... });

// Cache for 7 days (same essay = same score)
await redis.setex(cacheKey, 7 * 24 * 3600, JSON.stringify(score));
return score;
```

---

## Stage 4: 100K → 1M Users

**Infrastructure:**

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Railway/Fly.io (backend) | Multiple regions | $500 |
| Supabase Business | High-performance compute | $599 |
| Upstash Redis | Enterprise | $200 |
| Cloudflare R2 + CDN | | $100 |
| AI costs | ~$20,000/mo | $20,000 |
| Monitoring + Security | | $500 |
| **Total** | | **~$22,000/mo** |

**With 50,000 Pro subscribers at $7.99/month = $399,500 MRR**
Very strong unit economics.

**Major architectural changes:**

### Multi-region Deployment

Deploy the API in multiple regions to serve users with low latency:
- **EU West** (Paris/London) — France, UK, West Africa
- **Southeast Asia** (Singapore) — Vietnam, Philippines, India
- **North America** (US East) — Canada (TEF/TCF market)

Use Fly.io for multi-region with anycast routing.

### Question Bank Optimization

At 100K+ users, the question bank becomes a hot spot. Implement:
```sql
-- Partition questions table by exam_type for faster queries
CREATE TABLE questions_ielts PARTITION OF questions FOR VALUES IN ('IELTS');
CREATE TABLE questions_tef PARTITION OF questions FOR VALUES IN ('TEF');
CREATE TABLE questions_tcf PARTITION OF questions FOR VALUES IN ('TCF');
```

### AI Cost Optimization at Scale

| Strategy | Savings |
|----------|---------|
| Cache identical essay scores (hash-based) | 25-35% |
| Use Claude Haiku for initial scoring draft, Sonnet only for detailed feedback | 40-50% |
| Batch process non-urgent feedback (night jobs) | 20% |
| Local IELTS band prediction model for MCQ (no AI needed) | 100% for MCQ |

**Hybrid scoring model:**
```
MCQ/Fill-in-blank  →  Local scoring algorithm (free, instant)
Short answer       →  Claude Haiku (cheap, fast)
Essay              →  Claude Sonnet (best quality)
Speaking           →  Whisper + Claude Sonnet (keep quality high)
```

### Database Architecture at 1M Users

```
Write path:   App → Primary PostgreSQL (Supabase Business)
Read path:    App → Read Replica (auto-routed by Supabase)
Analytics:    Nightly export to ClickHouse for complex aggregations
Cache:        Redis for hot data (leaderboard, user stats)
```

---

## Cost Per User Analysis

| Stage | Users | Monthly Cost | Revenue (5% conversion, $7.99) | Margin |
|-------|-------|-------------|-------------------------------|--------|
| Stage 1 | 1K | $0 | $400 | 100% |
| Stage 2 | 10K | $131 | $4,000 | 97% |
| Stage 3 | 100K | $2,260 | $40,000 | 94% |
| Stage 4 | 1M | $22,000 | $400,000 | 95% |

The unit economics are exceptional because:
1. AI cost per user is small ($0.10-0.50/month for average user)
2. Question content is created once and served to millions
3. No human tutors to pay (AI does the scoring)

---

## Performance Targets

| Metric | Stage 2 | Stage 3 | Stage 4 |
|--------|---------|---------|---------|
| API response p95 | < 500ms | < 300ms | < 200ms |
| App load time | < 3s | < 2s | < 1.5s |
| AI writing score | < 20s | < 15s | < 10s |
| AI speaking score | < 40s | < 30s | < 20s |
| Exam load time | < 2s | < 1s | < 0.5s |
| DB query p99 | < 100ms | < 50ms | < 20ms |

---

## Reliability & Uptime

**Target: 99.9% uptime** (8.7 hours/year downtime maximum)

Key strategies:
1. **Database:** Supabase has built-in failover and daily backups
2. **Backend:** Railway restarts crashed containers automatically
3. **AI fallback:** If Claude API is down, queue scoring jobs and notify users
4. **Graceful degradation:** If AI scoring is unavailable, still let users take exams — score later
5. **Circuit breakers:** Don't cascade failures — if AI is slow, don't let it slow down the whole API

```javascript
// Example circuit breaker for AI service
const CircuitBreaker = require('opossum');

const scoreWithBreaker = new CircuitBreaker(aiService.scoreIELTSWriting, {
  timeout: 30000,        // If function takes > 30s, it's failed
  errorThresholdPercentage: 50,  // Open circuit if 50% of requests fail
  resetTimeout: 30000,   // Try again after 30s
});

scoreWithBreaker.fallback(() => ({
  status: 'queued',
  message: 'AI scoring is temporarily unavailable. Your result will be ready within 1 hour.',
}));
```
