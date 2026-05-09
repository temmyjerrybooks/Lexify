# Examify — Setup & Installation Guide

This guide walks you through setting up Examify on your local machine from scratch.
Written for developers of all levels — no prior experience with these tools required.

---

## Prerequisites

Before starting, install these on your computer:

| Tool | Version | Download |
|------|---------|----------|
| Node.js | 18+ | https://nodejs.org (download LTS version) |
| npm | comes with Node | included above |
| Git | any | https://git-scm.com |
| Expo Go | mobile app | App Store / Play Store on your phone |

**Optional but recommended:**
- VS Code: https://code.visualstudio.com
- Postman: https://postman.com (for testing API endpoints)

---

## Step 1: Create External Accounts

You need accounts on these free services before you can run the app.

### 1.1 Supabase (Database + Auth + Storage)

1. Go to https://supabase.com and create a free account
2. Click "New Project" and fill in:
   - Organization: your name or company
   - Project name: "examify"
   - Password: a strong password (save this!)
   - Region: choose closest to your target users (e.g. "West EU" for France, "Southeast Asia" for Vietnam)
3. Wait ~2 minutes for project to start
4. Go to **Settings → API** and copy:
   - `Project URL` → your `SUPABASE_URL`
   - `service_role` key → your `SUPABASE_SERVICE_ROLE_KEY`
   - `anon` key → your `SUPABASE_ANON_KEY`

### 1.2 Initialize the Database

1. In Supabase dashboard, click **SQL Editor**
2. Open the file `backend/database/schema.sql` from this project
3. Paste the entire content into the SQL Editor
4. Click **Run** — you should see "Success"
5. Repeat with `backend/database/seed.sql` to add sample exam data

### 1.3 Anthropic Claude API (AI Writing Scoring)

1. Go to https://console.anthropic.com
2. Create an account and add billing (they offer $5 free credit)
3. Go to **API Keys** and create a new key
4. Copy it → your `ANTHROPIC_API_KEY`

### 1.4 OpenAI API (Speaking Transcription)

1. Go to https://platform.openai.com
2. Create an account and add billing
3. Go to **API Keys** and create a key
4. Copy it → your `OPENAI_API_KEY`

### 1.5 Upstash Redis (Caching — Free Tier Available)

1. Go to https://upstash.com and sign up
2. Click "Create Database" → choose "Redis"
3. Name it "examify-cache", select a region
4. Click on the database → copy:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

---

## Step 2: Set Up the Backend

Open a terminal and run these commands:

```bash
# Navigate to the backend folder
cd examify/backend

# Install all dependencies
npm install

# Create your environment file from the template
cp .env.example .env
```

Now open `.env` in VS Code and fill in all the values you collected in Step 1:

```
NODE_ENV=development
PORT=3001

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...

ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...

UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token...
```

**Start the backend server:**

```bash
npm run dev
```

You should see:
```
Examify API running on port 3001 [development]
```

**Test it works:**

Open your browser and go to: `http://localhost:3001/health`

You should see:
```json
{
  "status": "ok",
  "service": "examify-api"
}
```

---

## Step 3: Set Up the Mobile App

Open a **new terminal window** (keep the backend running in the first one):

```bash
# Navigate to the mobile folder
cd examify/mobile

# Install all dependencies
npm install
```

Create a `.env` file for the mobile app:

```bash
# Create .env file
echo "EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1" > .env
```

> **Important:** If testing on a physical phone (not emulator), replace `localhost` with your computer's local IP address.
> Find it by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux) and looking for your WiFi IP (e.g., `192.168.1.5`).
> Then use: `EXPO_PUBLIC_API_URL=http://192.168.1.5:3001/api/v1`

**Start the Expo development server:**

```bash
npx expo start
```

You'll see a QR code in the terminal.

**To run on your phone:**
1. Download **Expo Go** from App Store / Play Store
2. Open Expo Go and scan the QR code
3. The app will load on your phone

**To run on an emulator:**
- Press `i` for iOS Simulator (Mac only, requires Xcode)
- Press `a` for Android Emulator (requires Android Studio)

---

## Step 4: Verify Everything Works

1. Open the app on your phone/emulator
2. Tap "Sign Up Free" and create an account
3. Complete the onboarding (select IELTS, set target band)
4. You should see the Home screen with sample exams
5. Tap a free exam and start it — questions should load
6. Complete a Writing task — your essay should be scored by AI within ~15 seconds

---

## Environment Variables Reference

### Backend (.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (never expose publicly) | Yes |
| `SUPABASE_ANON_KEY` | Anonymous/public key | Yes |
| `ANTHROPIC_API_KEY` | Claude API key for writing/speaking scoring | Yes |
| `OPENAI_API_KEY` | OpenAI key for Whisper transcription | Yes |
| `UPSTASH_REDIS_REST_URL` | Redis URL for caching | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth token | Yes |
| `PORT` | Server port (default: 3001) | No |
| `NODE_ENV` | `development` or `production` | No |
| `AI_RATE_LIMIT_MAX` | Max AI requests per user per hour (default: 20) | No |

### Mobile (.env)

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL |

---

## Common Issues

**"Cannot connect to Supabase"**
→ Double-check your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are copied correctly (no extra spaces)

**"Network request failed" on phone**
→ You're using `localhost` but the app is on your phone. Replace with your computer's IP address.

**"AI scoring is taking too long"**
→ This is normal on first request (cold start). Subsequent requests are faster.

**Expo can't find the app**
→ Make sure your phone and computer are on the same WiFi network.

---

## Next Steps

- See [API_DOCS.md](API_DOCS.md) to understand all available endpoints
- See [DEPLOYMENT.md](DEPLOYMENT.md) to deploy to production
- See [ARCHITECTURE.md](ARCHITECTURE.md) for system design details
