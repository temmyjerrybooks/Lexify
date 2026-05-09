# Examify — API Documentation

Base URL: `https://your-api.railway.app/api/v1`  
Local URL: `http://localhost:3001/api/v1`

All protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

---

## Authentication

### POST /auth/register

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "username": "temi_ielts",
  "full_name": "Temi Adebayo"
}
```

**Response 201:**
```json
{
  "message": "Account created! Please check your email to verify your account.",
  "user_id": "uuid-here"
}
```

**Error 409:**
```json
{ "error": "Username is already taken." }
```

---

### POST /auth/login

Log in and receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response 200:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "temi_ielts",
    "full_name": "Temi Adebayo",
    "subscription_tier": "FREE",
    "target_exam": "IELTS",
    "onboarding_completed": true,
    "current_streak": 7,
    "total_xp": 340
  }
}
```

---

### POST /auth/refresh

Exchange a refresh token for a new access token.

**Request Body:**
```json
{ "refresh_token": "eyJhbGci..." }
```

**Response 200:**
```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "expires_in": 3600
}
```

---

### GET /auth/me

Get the current user's profile and stats. `[Protected]`

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "temi_ielts",
    "subscription_tier": "PRO",
    "target_exam": "IELTS",
    "target_band": 7.5,
    "current_streak": 12,
    "longest_streak": 21,
    "total_xp": 1240,
    "total_exams_completed": 8,
    "avg_score": 6.8,
    "best_score": 7.5
  }
}
```

---

### POST /auth/complete-onboarding

Save the user's exam goals after signup. `[Protected]`

**Request Body:**
```json
{
  "target_exam": "IELTS",
  "target_band": 7.5,
  "exam_date": "2026-08-15",
  "country_code": "NG",
  "timezone": "Africa/Lagos"
}
```

**Response 200:**
```json
{ "message": "Onboarding complete. Let's start preparing!" }
```

---

## Exams

### GET /exams

List available mock exams.

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `exam_type` | string | Filter by `IELTS`, `TEF`, `TCF`, `DALF` |
| `difficulty` | string | `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `skill` | string | `READING`, `LISTENING`, `WRITING`, `SPEAKING` |
| `page` | int | Page number (default: 1) |
| `limit` | int | Results per page (default: 20) |

**Response 200:**
```json
{
  "exams": [
    {
      "id": "uuid",
      "exam_type": "IELTS",
      "title": "IELTS Academic Mock Test #1",
      "description": "Full-length IELTS Academic practice test...",
      "difficulty": "INTERMEDIATE",
      "skills": ["READING", "LISTENING", "WRITING", "SPEAKING"],
      "total_duration_minutes": 195,
      "is_free": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 48 }
}
```

---

### GET /exams/:examId

Get full exam details including all sections and questions.

**Response 200:**
```json
{
  "exam": {
    "id": "uuid",
    "exam_type": "IELTS",
    "title": "IELTS Academic Mock Test #1",
    "total_duration_minutes": 195,
    "exam_sections": [
      {
        "id": "uuid",
        "skill": "READING",
        "title": "Reading Passage 1: The History of Urban Parks",
        "instructions": "Read the passage and answer questions 1-13...",
        "duration_minutes": 60,
        "order_index": 1,
        "passage_text": "Urban parks as we know them today...",
        "audio_url": null,
        "questions": [
          {
            "id": "uuid",
            "question_type": "MULTIPLE_CHOICE",
            "order_index": 1,
            "question_text": "According to the passage, what was the significance...",
            "options": [
              { "label": "A", "text": "It was the first park ever built..." },
              { "label": "B", "text": "It was designed by Frederick..." }
            ],
            "points": 1,
            "difficulty": "INTERMEDIATE"
          }
        ]
      }
    ]
  }
}
```

> **Note:** `correct_answer` is intentionally omitted from the response to prevent cheating. It is revealed in the results after the session is completed.

---

### POST /exams/:examId/sessions/start

Start a new exam session (or resume existing). `[Protected]`

**Request Body:**
```json
{ "platform": "ios" }
```

**Response 201 (new session):**
```json
{
  "session_id": "uuid",
  "status": "started",
  "started_at": "2026-05-01T10:30:00Z"
}
```

**Response 200 (resuming existing session):**
```json
{
  "session_id": "uuid",
  "status": "resumed",
  "started_at": "2026-05-01T10:30:00Z",
  "message": "Resuming your in-progress session."
}
```

---

### POST /exams/sessions/:sessionId/answer

Submit an answer for a question. `[Protected]`

**Request Body:**
```json
{
  "question_id": "uuid",
  "answer_text": null,
  "answer_options": ["C"],
  "time_spent_seconds": 45
}
```

For writing questions:
```json
{
  "question_id": "uuid",
  "answer_text": "The chart illustrates the trends in car ownership...",
  "answer_options": null,
  "time_spent_seconds": 1840
}
```

**Response 200:**
```json
{
  "answer_id": "uuid",
  "is_correct": true,
  "points_earned": 1
}
```

> For ESSAY and SPEAKING_RESPONSE types, `is_correct` is `null` — AI scoring happens asynchronously.

---

### POST /exams/sessions/:sessionId/complete

Submit the exam and calculate the final score. `[Protected]`

**Response 200:**
```json
{
  "result_id": "uuid",
  "overall_score": 7.0,
  "band_score": 7.0,
  "score_breakdown": {
    "READING": { "raw": 30, "total": 40, "band": 7.0 },
    "LISTENING": { "raw": 32, "total": 40, "band": 7.5 }
  },
  "weak_areas": ["true_false", "statistics"],
  "xp_earned": 70
}
```

---

### GET /exams/daily/challenge

Get today's daily challenge questions (same for all users on a given day).

**Response 200:**
```json
{
  "date": "2026-05-01",
  "questions": [
    {
      "id": "uuid",
      "question_text": "According to the text...",
      "options": [...],
      "question_type": "MULTIPLE_CHOICE",
      "skill": "READING",
      "exam_type": "IELTS",
      "difficulty": "INTERMEDIATE"
    }
  ]
}
```

---

## AI Scoring

### POST /ai/score/writing

Submit a writing answer for AI scoring. `[Protected]`

Returns immediately with a `feedback_id`. Poll `/ai/feedback/:id` to get the result.

**Request Body:**
```json
{
  "session_id": "uuid",
  "answer_id": "uuid",
  "question_id": "uuid",
  "task_number": 2,
  "exam_type": "IELTS",
  "question_text": "Many people believe that...",
  "user_answer": "In contemporary society, it is widely argued that..."
}
```

**Response 202:**
```json
{
  "feedback_id": "uuid",
  "status": "processing",
  "message": "Your essay is being scored by AI. Check back in 10-15 seconds.",
  "poll_url": "/api/v1/ai/feedback/uuid"
}
```

---

### POST /ai/score/speaking

Submit a speaking audio recording for transcription and scoring. `[Protected]`

**Request:** `multipart/form-data`

| Field | Type | Description |
|-------|------|-------------|
| `audio` | file | Audio file (mp3, m4a, wav, webm, ogg — max 25MB) |
| `session_id` | string | Exam session ID |
| `question_id` | string | Question ID |
| `question_text` | string | The speaking prompt text |
| `part_number` | integer | IELTS Part 1, 2, or 3 |
| `exam_type` | string | `IELTS`, `TEF`, etc. |

**Response 202:**
```json
{
  "feedback_id": "uuid",
  "status": "processing",
  "message": "Your speaking response is being transcribed and scored. Check back in 20-30 seconds.",
  "poll_url": "/api/v1/ai/feedback/uuid"
}
```

---

### GET /ai/feedback/:feedbackId

Poll for the status and result of AI scoring. `[Protected]`

**Response 200 — while processing:**
```json
{
  "feedback": {
    "id": "uuid",
    "skill": "WRITING",
    "status": "PROCESSING"
  }
}
```

**Response 200 — completed (IELTS Writing):**
```json
{
  "feedback": {
    "id": "uuid",
    "skill": "WRITING",
    "status": "COMPLETED",
    "criteria_scores": {
      "task_response": 7.0,
      "coherence_and_cohesion": 6.5,
      "lexical_resource": 7.0,
      "grammatical_range_and_accuracy": 7.0
    },
    "overall_score": 7.0,
    "strengths": [
      "Clear position maintained throughout the essay",
      "Good range of topic-specific vocabulary",
      "Well-structured paragraphs with topic sentences"
    ],
    "improvements": [
      "Develop counter-arguments more explicitly",
      "Vary sentence structures more (too many compound sentences)",
      "Some cohesive devices are overused (e.g., 'Furthermore')"
    ],
    "detailed_feedback": "This response addresses the task well with a clear position...",
    "model_answer": "The issue of income inequality has become one of the most pressing challenges..."
  }
}
```

**Response 200 — completed (IELTS Speaking):**
```json
{
  "feedback": {
    "id": "uuid",
    "skill": "SPEAKING",
    "status": "COMPLETED",
    "transcript": "Well, I grew up in Lagos which is the largest city in Nigeria...",
    "criteria_scores": {
      "fluency_and_coherence": 6.5,
      "lexical_resource": 7.0,
      "grammatical_range_and_accuracy": 6.5,
      "pronunciation": 6.0,
      "words_per_minute": 142,
      "pause_ratio": 18
    },
    "overall_score": 6.5,
    "strengths": ["Good range of vocabulary", "Clear logical organization"],
    "improvements": ["Reduce filler words (um, uh)", "More complex sentence structures needed"]
  }
}
```

---

### POST /ai/tutor/chat

Chat with the AI tutor. `[Protected — Elite only]`

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "I keep losing marks on Task 2 coherence. What am I doing wrong?" }
  ]
}
```

**Response 200:**
```json
{
  "reply": "Great question! Coherence issues in Task 2 usually come down to three common mistakes...",
  "tokens_used": 312
}
```

---

## Results

### GET /results/:resultId

Get a specific exam result. `[Protected]`

**Response 200:**
```json
{
  "result": {
    "id": "uuid",
    "session_id": "uuid",
    "exam_type": "IELTS",
    "reading_score": 7.0,
    "listening_score": 7.5,
    "writing_score": 6.5,
    "speaking_score": 7.0,
    "overall_score": 7.0,
    "band_score": 7.0,
    "cefr_level": "C1",
    "score_breakdown": {...},
    "weak_areas": ["true_false", "statistics"],
    "strong_areas": ["reading_comprehension", "detail"],
    "created_at": "2026-05-01T11:45:00Z"
  }
}
```

---

### GET /results

List the current user's past results. `[Protected]`

**Query Parameters:** `exam_type`, `page`, `limit`

**Response 200:**
```json
{
  "results": [...],
  "pagination": { "page": 1, "limit": 20, "total": 14 }
}
```

---

## Streaks

### GET /streaks/me

Get the current user's streak data. `[Protected]`

**Response 200:**
```json
{
  "current_streak": 12,
  "longest_streak": 21,
  "practiced_today": true,
  "streak_at_risk": false,
  "hours_to_midnight": 8
}
```

---

## Leaderboard

### GET /leaderboard

Get the weekly leaderboard. `[Protected]`

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `scope` | string | `global` or `country` (default: `global`) |
| `limit` | int | Number of entries (default: 50) |

**Response 200:**
```json
{
  "week_start": "2026-04-28",
  "entries": [
    {
      "rank": 1,
      "username": "temi_ielts",
      "full_name": "Temi Adebayo",
      "avatar_url": "https://...",
      "country_code": "NG",
      "xp_earned": 890,
      "exams_completed": 7
    }
  ],
  "my_rank": 4
}
```

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad request — check your request body |
| 401 | Unauthorized — missing or expired token |
| 403 | Forbidden — subscription tier too low |
| 404 | Resource not found |
| 409 | Conflict — e.g. username taken, session already completed |
| 429 | Rate limited — slow down requests |
| 500 | Server error — report at GitHub Issues |

All errors return:
```json
{ "error": "Human-readable message explaining the problem." }
```
