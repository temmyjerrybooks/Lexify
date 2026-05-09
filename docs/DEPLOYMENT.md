# Examify — Deployment Guide

---

## Backend Deployment (Railway — Recommended)

Railway is the easiest way to deploy a Node.js backend. Free tier available, scales automatically.

### Step 1: Create Railway Account

1. Go to https://railway.app and sign up with GitHub
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `examify` repository
4. Choose the `backend` folder as the root directory

### Step 2: Configure Environment Variables

In Railway dashboard → your project → Variables, add all variables from `.env.example`:

```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
ALLOWED_ORIGINS=https://your-app.com
LOG_LEVEL=info
```

### Step 3: Configure Build Settings

Railway auto-detects Node.js. Verify these settings:
- **Start command:** `node src/server.js`
- **Watch paths:** `backend/`

### Step 4: Add Custom Domain (Optional)

In Railway → Settings → Domains:
- Add your domain: `api.examify.app`
- Add CNAME record in your DNS: `api.examify.app → your-app.railway.app`

### Step 5: Verify Deployment

Once deployed, test your live API:
```bash
curl https://your-app.railway.app/health
# Should return: {"status": "ok", "service": "examify-api"}
```

---

## Alternative Backend Hosts

### Render (render.com)
Similar to Railway, also free tier available. Deploy as a "Web Service":
- Build command: `npm install`
- Start command: `node src/server.js`
- Environment: Node

### Fly.io
Better for high-traffic scenarios. Requires `fly.toml` config:
```toml
app = "examify-api"
primary_region = "cdg"  # Paris for EU/Africa latency

[build]
  builder = "heroku/buildpacks:20"

[http_service]
  internal_port = 3001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
```

---

## Mobile App Deployment

### Prerequisites

1. Create an Expo account: https://expo.dev
2. Install EAS CLI: `npm install -g eas-cli`
3. Log in: `eas login`

### Step 1: Configure EAS

In `mobile/app.json`, update:
```json
{
  "expo": {
    "extra": {
      "eas": { "projectId": "your-eas-project-id" }
    }
  }
}
```

Find your project ID after running `eas init` in the mobile folder.

Create `mobile/eas.json`:
```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://your-api.railway.app/api/v1"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 2: Build for Android

```bash
cd mobile

# Build APK for testing (share with testers without Play Store)
eas build --platform android --profile preview

# Build AAB for Play Store submission
eas build --platform android --profile production
```

### Step 3: Build for iOS

```bash
# Build for TestFlight (requires Apple Developer account - $99/year)
eas build --platform ios --profile preview

# Build for App Store submission
eas build --platform ios --profile production
```

### Step 4: Submit to Stores

**Google Play Store:**
1. Create a Google Play Developer account ($25 one-time fee)
2. Create a new app in Play Console
3. Upload your AAB file, or use EAS Submit:
```bash
eas submit --platform android
```

**Apple App Store:**
1. Create Apple Developer account ($99/year)
2. Create app in App Store Connect
3. Use EAS Submit:
```bash
eas submit --platform ios
```

### Step 5: OTA Updates (Without App Store Review)

One of Expo's biggest advantages — you can push JavaScript updates instantly without going through the App Store review process (for JS-only changes):

```bash
# Push an update to all production users immediately
eas update --branch production --message "Fix: Streak calculation bug"
```

> **Note:** Native code changes (new permissions, new native packages) still require a full build and app store review.

---

## Supabase Production Checklist

Before going live, verify these in Supabase dashboard:

- [ ] **Row Level Security** is enabled on all user tables (check schema.sql — done)
- [ ] **Email auth** is configured with your domain in Authentication settings
- [ ] **Storage buckets** exist: `exam-audio` and `avatars` — set appropriate public/private access
- [ ] **Database backups** are enabled (Settings → Database)
- [ ] **Service role key** is only in your backend env vars — never in the mobile app
- [ ] **API rate limits** are configured in Settings → API

---

## Monitoring & Observability

### Error Tracking

Add Sentry for production error tracking:

```bash
# Backend
npm install @sentry/node

# In server.js, add before routes:
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
app.use(Sentry.Handlers.requestHandler());
```

```bash
# Mobile
npx expo install @sentry/react-native
```

### Analytics — PostHog

Self-host on Railway (free) or use PostHog Cloud:

```bash
# Mobile
npm install posthog-react-native

# Track key events:
posthog.capture('exam_started', { exam_type: 'IELTS', difficulty: 'INTERMEDIATE' })
posthog.capture('exam_completed', { overall_score: 7.0, time_spent: 3240 })
posthog.capture('subscription_upgraded', { from: 'FREE', to: 'PRO' })
```

### Key Metrics to Track

| Metric | Target | Tool |
|--------|--------|------|
| API response time p95 | < 200ms | Railway metrics |
| AI scoring time p95 | < 30s | Sentry traces |
| Daily Active Users | Growing 10%/week | PostHog |
| Exam completion rate | > 60% | PostHog funnel |
| Streak retention D7 | > 40% | PostHog cohort |
| Subscription conversion | > 5% | PostHog + RevenueCat |

---

## Production Environment Checklist

- [ ] All API keys are in environment variables (never in code)
- [ ] `NODE_ENV=production` is set
- [ ] HTTPS is enforced (Railway does this automatically)
- [ ] `ALLOWED_ORIGINS` is set to your actual app domain
- [ ] Rate limiting is configured
- [ ] Error tracking (Sentry) is set up
- [ ] Database backups are scheduled
- [ ] AI spend limits are set in Anthropic and OpenAI dashboards
