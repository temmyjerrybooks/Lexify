# Examify — System Architecture

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MOBILE APP (Expo/RN)                   │
│  iOS + Android                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Screens │  │  Redux   │  │  React   │              │
│  │  & Nav   │  │  Store   │  │  Query   │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       └─────────────┼─────────────┘                     │
│                     │ Axios HTTP                         │
└─────────────────────┼───────────────────────────────────┘
                       │
                  HTTPS / REST
                       │
┌─────────────────────▼───────────────────────────────────┐
│               BACKEND API (Node.js/Express)              │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   Auth   │  │   Exam   │  │   AI     │              │
│  │ Middleware│  │ Controller│  │Controller│              │
│  └──────────┘  └──────────┘  └──────────┘              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Scoring │  │  Streak  │  │  Speech  │              │
│  │  Service │  │  Service │  │  Service │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
└───────┼─────────────┼─────────────┼─────────────────────┘
        │             │             │
   ┌────▼────┐   ┌────▼────┐   ┌───▼──────┐
   │Supabase │   │  Redis  │   │ Anthropic │
   │PostgreSQL│   │ Upstash │   │  Claude  │
   │+ Storage│   │  Cache  │   │   API    │
   └─────────┘   └─────────┘   └──────────┘
                                      │
                               ┌──────▼──────┐
                               │  OpenAI     │
                               │  Whisper    │
                               │  (STT)      │
                               └─────────────┘
```

---

## Component Breakdown

### Mobile App

The app is built with **React Native + Expo**, so one codebase runs on both iOS and Android.

**State Management: Two-layer approach**

| Layer | Tool | What it manages |
|-------|------|----------------|
| Server state | React Query | API data (exams list, results, leaderboard) — handles caching, loading states, background refresh |
| Client state | Redux Toolkit | Auth session, active exam, streak — data that multiple screens need simultaneously |

**Why this split?** React Query is much better at fetching and caching API data (automatic background refresh, error retry, stale-while-revalidate). Redux handles cross-screen state that isn't fetched from an API.

**Navigation:** React Navigation with separate Stack navigators per tab. The exam flow uses `gestureEnabled: false` on the MockExam screen to prevent accidental swipe-back mid-exam.

**Secure Storage:** JWT tokens are stored in Expo SecureStore (encrypted native keychain), not AsyncStorage. This is critical for security.

---

### Backend API

Built with **Node.js + Express** — chosen because:
- Same language as the mobile app (JavaScript throughout)
- Excellent ecosystem for async AI API calls (non-blocking I/O)
- Easy to reason about — no magic

**Request lifecycle for an exam answer:**
```
POST /exams/sessions/:id/answer
         │
    verifyToken (middleware)
         │ checks JWT with Supabase Auth
         │
    examController.submitAnswer
         │
         ├── Fetch question from Supabase (to get type + correct answer)
         │
         ├── Auto-grade MCQ/TF/Fill-in-blank (immediate)
         │
         ├── For ESSAY/SPEAKING: return 200 immediately
         │   └── AI scoring happens asynchronously (POST /ai/score/writing)
         │
         └── Save to user_answers table
```

**Why async AI scoring?**
Claude API takes 8-15 seconds for writing feedback, and Whisper + Claude for speaking takes 20-40 seconds. Making the user wait for these synchronously would feel broken. Instead:
1. User submits → server immediately returns `{ feedback_id, status: "processing" }`
2. AI scoring runs in the background
3. Mobile app polls `/ai/feedback/:id` every 5 seconds
4. When `status: "COMPLETED"`, the result screen shows the feedback

---

### Database (PostgreSQL via Supabase)

**Why Supabase over Firebase?**

| Feature | Supabase | Firebase |
|---------|----------|----------|
| Query complexity | Full SQL (JOINs, aggregations) | Limited NoSQL queries |
| Pricing at scale | Predictable (GB-based) | Can get expensive (read-based) |
| Real-time | Yes (WebSockets) | Yes |
| Auth | Built-in | Built-in |
| Storage | S3-compatible | Yes |
| Open source | Yes | No |

The analytics queries we need (e.g., "user's average score per skill over 30 days", "leaderboard rank") are trivial in SQL but painful in Firestore.

**Row Level Security (RLS):** Every user-data table has RLS policies enabled. This means even if someone bypasses the API and queries Supabase directly with their own JWT, they can only see their own data. Security is enforced at the database level, not just the application layer.

**Key table relationships:**
```
auth.users (Supabase managed)
     │
     └── profiles (one-to-one)
              │
              ├── exam_sessions ──── exams
              │         │               │
              │         └── user_answers ── questions ── exam_sections
              │                                               │
              │                                           exam_sections
              │
              ├── exam_results
              ├── ai_feedback
              ├── streaks
              ├── daily_activities
              └── subscriptions
```

---

### AI System

**Writing Scoring Pipeline:**
```
User Essay Text
      │
      ▼
Claude Sonnet (claude-sonnet-4-6)
System Prompt: "You are an IELTS examiner..."
User Prompt: Question + Essay + "Return JSON only"
      │
      ▼
JSON Response: {
  criteria_scores: { task_response: 7.0, coherence: 6.5, ... },
  overall_score: 6.8,
  strengths: [...],
  improvements: [...],
  detailed_feedback: "...",
  model_answer_excerpt: "..."
}
      │
      ▼
Save to ai_feedback table
```

**Speaking Scoring Pipeline:**
```
Audio File (m4a/mp3)
      │
      ├── Upload to Supabase Storage (async)
      │
      ▼
OpenAI Whisper API (whisper-1)
→ Returns: { text, language, duration, words: [{word, start, end}] }
      │
      ├── Analyze fluency from word timestamps
      │   (words/minute, pause ratio)
      │
      ▼
Claude Sonnet
System: "You are an IELTS Speaking examiner..."
Prompt: Question + Transcript + Fluency stats
      │
      ▼
JSON: {
  criteria_scores: { fluency: 6.5, lexical: 7.0, grammar: 6.5, pronunciation: 6.0 },
  overall_score: 6.5,
  detailed_feedback: "..."
}
      │
      ▼
Save to ai_feedback + update user_answers with transcript
```

---

### Scoring Engine

**IELTS Band Conversion:**

Reading and Listening use official raw score → band conversion tables (exact same lookup tables Cambridge Assessment English publishes).

Writing and Speaking use AI scoring that directly outputs band scores per criterion, then averages them.

Overall IELTS band = average of all 4 skills, rounded to nearest 0.5.

**TEF/TCF Scoring:**

Each skill scored as a percentage of raw points, then converted to TEF's 0-450 scale using official ranges, then mapped to CEFR level.

---

### Security Architecture

1. **Authentication:** Supabase JWTs, verified server-side on every protected request
2. **RLS:** Database-level user data isolation — users can never access other users' data
3. **Rate Limiting:** General API: 100 req/15min. AI endpoints: 20 req/hour (cost protection)
4. **Input Validation:** All request bodies validated with Zod before processing
5. **HTTPS only:** Enforced in production via Railway/Render settings
6. **No answer exposure:** Correct answers are never returned in the GET /exams response — only revealed after session completion

---

### Caching Strategy

| Data | Cache TTL | Why |
|------|-----------|-----|
| Exam list | 5 minutes | Changes rarely, high traffic |
| Daily challenge | 1 hour | Same for all users today |
| Leaderboard | 10 minutes | Rebuilding is expensive |
| User profile | 30 seconds | Needs to feel real-time |
| AI feedback | Not cached | Always fresh, per-user |

Redis (Upstash) is used for server-side caching. React Query handles client-side caching (staleTime: 5min for exam lists).
