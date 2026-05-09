# 📚 Examify — AI-Powered Language Exam Preparation

> Pass IELTS, TEF, TCF, or DALF faster with AI-scored mock exams, adaptive learning, and addictive daily practice.

[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue)](https://reactnative.dev)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-orange)](https://supabase.com)
[![Claude API](https://img.shields.io/badge/AI-Claude%20Sonnet-purple)](https://anthropic.com)

---

## What is Examify?

Examify is a mobile-first exam preparation platform for language certification tests:

| Exam | Focus | Market |
|------|-------|--------|
| **IELTS** | Academic & General English | Global (India, Africa, Middle East) |
| **TEF** | French for Canadian immigration | Francophone Africa, Vietnam, China |
| **TCF** | French proficiency certification | Canada-bound immigrants |
| **DALF** | Advanced French for academic/pro use | Europe, French-speaking Africa |

**Key Differentiator:** The first mobile app to take TEF/TCF/DALF prep as seriously as IELTS — a massively underserved market with ~430,000 annual test-takers and almost no quality mobile competition.

---

## Core Features

- 🎯 **Realistic Mock Exams** — Timed tests matching real exam format exactly
- 🤖 **AI Writing Scorer** — Claude API scores essays using official band descriptors  
- 🎙️ **AI Speaking Scorer** — Whisper transcription + Claude feedback on speaking responses
- 📈 **Adaptive Progress** — Identifies weak areas and personalizes practice
- 🔥 **Streak System** — Daily practice streaks with freeze tokens (like Duolingo)
- 🏆 **Leaderboards** — Compete with users in your country
- 📊 **Analytics Dashboard** — Score trends over time, skill breakdowns

---

## Tech Stack

```
Mobile App     →  React Native + Expo SDK 51 (iOS + Android)
State          →  Redux Toolkit + React Query
Backend API    →  Node.js + Express
Database       →  PostgreSQL via Supabase
Auth           →  Supabase Auth (JWT)
AI Writing     →  Anthropic Claude API (claude-sonnet-4-6)
AI Speaking    →  OpenAI Whisper (STT) + Claude (scoring)
File Storage   →  Supabase Storage (audio recordings)
Cache          →  Redis via Upstash
Payments       →  RevenueCat + Stripe + Flutterwave
Push Notifs    →  Expo Push Notifications + OneSignal
Analytics      →  PostHog
```

---

## Project Structure

```
examify/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md       # System design overview
│   ├── API_DOCS.md           # All API endpoints
│   ├── SETUP_GUIDE.md        # Installation & local development
│   ├── DEPLOYMENT.md         # Production deployment guide
│   ├── SCALING.md            # Scaling from 10K → 1M users
│   └── UI_UX_GUIDE.md        # Screen flows and design system
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   ├── schema.sql        # Full PostgreSQL schema
│   │   └── seed.sql          # Sample exam data
│   └── src/
│       ├── server.js         # Express entry point
│       ├── config/           # Supabase, Redis clients
│       ├── middleware/        # Auth, error handling, rate limiting
│       ├── routes/           # Route definitions
│       ├── controllers/      # Request handlers
│       ├── services/         # AI, scoring, streak business logic
│       └── utils/            # Logger, helpers
└── mobile/
    ├── package.json
    ├── app.json              # Expo config
    ├── App.jsx               # Root component
    └── src/
        ├── navigation/       # Stack & tab navigators
        ├── screens/          # All app screens
        ├── components/       # Reusable UI components
        ├── store/            # Redux store + slices
        ├── services/         # API client (Axios)
        ├── hooks/            # Custom React hooks
        ├── theme/            # Colors, typography, spacing
        └── utils/            # Formatting, scoring helpers
```

---

## Quick Start

See [docs/SETUP_GUIDE.md](docs/SETUP_GUIDE.md) for full installation instructions.

```bash
# 1. Clone and setup backend
cd examify/backend
npm install
cp .env.example .env  # Fill in your API keys
node src/server.js

# 2. Setup mobile app
cd examify/mobile
npm install
npx expo start
```

---

## Monetization

| Tier | Price | Features |
|------|-------|---------|
| **Free** | $0 | 5 exams/month, 3 AI feedbacks, 1 exam type |
| **Pro** | $7.99/month | Unlimited exams, all exam types, full AI feedback |
| **Elite** | $19.99/month | Pro + AI tutor chat, personalized study plan |

**Africa pricing:** ₦2,500/month (NGN), 3,000 XOF/month — local payment via Flutterwave.

---

## License

MIT License — see LICENSE file.
