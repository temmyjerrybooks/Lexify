-- =============================================================
-- EXAMIFY DATABASE SCHEMA
-- PostgreSQL via Supabase
-- =============================================================
-- Run this in Supabase SQL Editor to initialize the database.
-- Tables are ordered to respect foreign key dependencies.
-- =============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE exam_type AS ENUM ('IELTS', 'TEF', 'TCF', 'DALF');
CREATE TYPE exam_skill AS ENUM ('READING', 'LISTENING', 'WRITING', 'SPEAKING');
CREATE TYPE question_type AS ENUM (
  'MULTIPLE_CHOICE',
  'TRUE_FALSE_NOT_GIVEN',
  'FILL_IN_BLANK',
  'MATCHING',
  'SHORT_ANSWER',
  'ESSAY',
  'SPEAKING_RESPONSE'
);
CREATE TYPE difficulty_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
CREATE TYPE session_status AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'PAUSED');
CREATE TYPE subscription_tier AS ENUM ('FREE', 'PRO', 'ELITE');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'CANCELLED', 'EXPIRED', 'TRIAL');
CREATE TYPE feedback_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- =============================================================
-- USERS TABLE
-- Extends Supabase Auth (auth.users)
-- =============================================================

CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        VARCHAR(50) UNIQUE NOT NULL,
  full_name       VARCHAR(100),
  avatar_url      TEXT,
  country_code    CHAR(2),                            -- ISO 3166-1 alpha-2 (NG, CM, VN...)
  target_exam     exam_type,                          -- Primary exam the user is preparing for
  target_band     DECIMAL(2,1),                       -- Target IELTS band or equivalent
  exam_date       DATE,                               -- Scheduled exam date
  subscription_tier subscription_tier DEFAULT 'FREE',
  timezone        VARCHAR(50) DEFAULT 'UTC',
  notification_enabled BOOLEAN DEFAULT TRUE,
  streak_freeze_tokens INT DEFAULT 0,                 -- Earned freeze tokens (like Duolingo)
  total_xp        INT DEFAULT 0,                      -- Gamification XP
  referral_code   VARCHAR(10) UNIQUE,                 -- For referral program
  referred_by     UUID REFERENCES public.profiles(id),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- SUBSCRIPTIONS TABLE
-- =============================================================

CREATE TABLE public.subscriptions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier              subscription_tier NOT NULL,
  status            subscription_status NOT NULL DEFAULT 'TRIAL',
  provider          VARCHAR(50),                      -- 'revenuecat', 'stripe', 'flutterwave'
  provider_sub_id   VARCHAR(200),                     -- External subscription ID
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  amount_cents      INT,
  currency          CHAR(3),                          -- USD, NGN, XOF, EUR...
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EXAMS TABLE
-- A "template" for a full mock exam (e.g. "IELTS Academic Mock #1")
-- =============================================================

CREATE TABLE public.exams (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_type       exam_type NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  difficulty      difficulty_level DEFAULT 'INTERMEDIATE',
  skills          exam_skill[] NOT NULL,               -- Which skills this exam tests
  total_duration_minutes INT NOT NULL,
  is_free         BOOLEAN DEFAULT FALSE,               -- Free tier access
  is_published    BOOLEAN DEFAULT FALSE,
  version         INT DEFAULT 1,
  metadata        JSONB DEFAULT '{}',                  -- Flexible: passing score, format notes
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EXAM SECTIONS TABLE
-- Each exam has sections (e.g. IELTS Reading has 3 passages)
-- =============================================================

CREATE TABLE public.exam_sections (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exam_id         UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  skill           exam_skill NOT NULL,
  title           VARCHAR(200),
  instructions    TEXT,
  duration_minutes INT NOT NULL,
  order_index     SMALLINT NOT NULL,                   -- Section ordering
  audio_url       TEXT,                                -- For LISTENING sections
  passage_text    TEXT,                                -- For READING sections
  metadata        JSONB DEFAULT '{}'
);

-- =============================================================
-- QUESTIONS TABLE
-- =============================================================

CREATE TABLE public.questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id      UUID NOT NULL REFERENCES public.exam_sections(id) ON DELETE CASCADE,
  question_type   question_type NOT NULL,
  skill           exam_skill NOT NULL,
  exam_type       exam_type NOT NULL,
  order_index     SMALLINT NOT NULL,
  question_text   TEXT NOT NULL,
  options         JSONB,                               -- MCQ: [{label:"A", text:"..."}, ...]
  correct_answer  TEXT,                                -- For auto-graded questions
  answer_explanation TEXT,                             -- Why this is correct
  points          SMALLINT DEFAULT 1,
  difficulty      difficulty_level DEFAULT 'INTERMEDIATE',
  tags            TEXT[],                              -- Topic tags for weak-area analysis
  ai_generated    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- USER EXAM SESSIONS TABLE
-- Each time a user starts a mock exam
-- =============================================================

CREATE TABLE public.exam_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES public.exams(id),
  status          session_status DEFAULT 'IN_PROGRESS',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  current_section_id UUID REFERENCES public.exam_sections(id),  -- For resuming
  current_question_index INT DEFAULT 0,
  snapshot        JSONB DEFAULT '{}',                  -- Saved state for resume
  device_info     JSONB DEFAULT '{}'                   -- OS, app version for debugging
);

-- =============================================================
-- USER ANSWERS TABLE
-- Each answer submitted during a session
-- =============================================================

CREATE TABLE public.user_answers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES public.questions(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  answer_text     TEXT,                                -- Written answer or transcribed speech
  answer_audio_url TEXT,                              -- Speaking: raw audio file URL
  answer_options  TEXT[],                              -- Selected option labels for MCQ
  is_correct      BOOLEAN,                             -- NULL for essay/speaking (AI graded)
  points_earned   SMALLINT DEFAULT 0,
  time_spent_seconds INT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EXAM RESULTS TABLE
-- Aggregated scores per completed session
-- =============================================================

CREATE TABLE public.exam_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID UNIQUE NOT NULL REFERENCES public.exam_sessions(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  exam_id         UUID NOT NULL REFERENCES public.exams(id),

  -- Section scores (null if not tested)
  reading_score   DECIMAL(4,2),
  listening_score DECIMAL(4,2),
  writing_score   DECIMAL(4,2),
  speaking_score  DECIMAL(4,2),
  overall_score   DECIMAL(4,2) NOT NULL,

  -- Exam-specific band/level
  band_score      DECIMAL(3,1),                        -- IELTS: 1.0-9.0
  cefr_level      VARCHAR(3),                          -- A1, A2, B1, B2, C1, C2
  predicted_pass  BOOLEAN,

  -- Breakdown for analytics
  score_breakdown JSONB DEFAULT '{}',                  -- Per-skill detailed scores
  weak_areas      TEXT[],                              -- Tags where user struggled
  strong_areas    TEXT[],

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- AI FEEDBACK TABLE
-- Stores AI-generated feedback for writing and speaking
-- =============================================================

CREATE TABLE public.ai_feedback (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  answer_id       UUID REFERENCES public.user_answers(id) ON DELETE CASCADE,
  session_id      UUID NOT NULL REFERENCES public.exam_sessions(id),
  user_id         UUID NOT NULL REFERENCES public.profiles(id),
  skill           exam_skill NOT NULL,

  -- Transcription (speaking only)
  transcript      TEXT,

  -- Scores per IELTS/TEF rubric criteria
  criteria_scores JSONB NOT NULL DEFAULT '{}',
  -- IELTS Writing: {task_achievement: 7.0, coherence: 6.5, lexical: 7.0, grammar: 7.0}
  -- IELTS Speaking: {fluency: 6.5, lexical: 7.0, grammar: 6.5, pronunciation: 7.0}

  overall_score   DECIMAL(3,1),

  -- Human-readable feedback
  strengths       TEXT[],
  improvements    TEXT[],
  detailed_feedback TEXT,
  model_answer    TEXT,                                -- What a high-scoring answer looks like

  -- AI processing metadata
  ai_model        VARCHAR(50),                         -- e.g. 'claude-sonnet-4-6'
  tokens_used     INT,
  processing_time_ms INT,
  status          feedback_status DEFAULT 'PENDING',
  error_message   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- STREAKS TABLE
-- =============================================================

CREATE TABLE public.streaks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_streak  INT DEFAULT 0,
  longest_streak  INT DEFAULT 0,
  last_activity_date DATE,
  streak_start_date  DATE,
  total_practice_days INT DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.daily_activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date   DATE NOT NULL,
  xp_earned       INT DEFAULT 0,
  questions_answered INT DEFAULT 0,
  minutes_practiced INT DEFAULT 0,
  sessions_completed INT DEFAULT 0,
  UNIQUE(user_id, activity_date)
);

-- =============================================================
-- LEADERBOARD TABLE
-- Materialized weekly — rebuilt by a cron job
-- =============================================================

CREATE TABLE public.leaderboard_weekly (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start      DATE NOT NULL,
  xp_earned       INT DEFAULT 0,
  exams_completed INT DEFAULT 0,
  rank_global     INT,
  rank_country    INT,
  country_code    CHAR(2),
  UNIQUE(user_id, week_start)
);

-- =============================================================
-- NOTIFICATIONS TABLE
-- =============================================================

CREATE TABLE public.notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            VARCHAR(50) NOT NULL,                -- 'streak_reminder', 'result_ready', 'achievement'
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',
  read            BOOLEAN DEFAULT FALSE,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- REFERRALS TABLE
-- =============================================================

CREATE TABLE public.referrals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id     UUID NOT NULL REFERENCES public.profiles(id),
  referred_id     UUID NOT NULL REFERENCES public.profiles(id),
  reward_granted  BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);

-- =============================================================
-- INDEXES (Performance)
-- =============================================================

CREATE INDEX idx_exam_sessions_user_id ON public.exam_sessions(user_id);
CREATE INDEX idx_exam_sessions_status ON public.exam_sessions(status);
CREATE INDEX idx_user_answers_session_id ON public.user_answers(session_id);
CREATE INDEX idx_user_answers_user_id ON public.user_answers(user_id);
CREATE INDEX idx_exam_results_user_id ON public.exam_results(user_id);
CREATE INDEX idx_ai_feedback_session_id ON public.ai_feedback(session_id);
CREATE INDEX idx_ai_feedback_status ON public.ai_feedback(status);
CREATE INDEX idx_daily_activities_user_date ON public.daily_activities(user_id, activity_date DESC);
CREATE INDEX idx_questions_section_id ON public.questions(section_id);
CREATE INDEX idx_questions_exam_type ON public.questions(exam_type, skill, difficulty);
CREATE INDEX idx_leaderboard_week_rank ON public.leaderboard_weekly(week_start, xp_earned DESC);

-- =============================================================
-- ROW LEVEL SECURITY (Supabase RLS)
-- Users can only access their own data
-- =============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_activities ENABLE ROW LEVEL SECURITY;

-- Profiles: users see only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Exam sessions: users see only their own sessions
CREATE POLICY "Users can manage own sessions"
  ON public.exam_sessions FOR ALL USING (auth.uid() = user_id);

-- Answers: users see only their own answers
CREATE POLICY "Users can manage own answers"
  ON public.user_answers FOR ALL USING (auth.uid() = user_id);

-- Results: users see only their own results
CREATE POLICY "Users can view own results"
  ON public.exam_results FOR SELECT USING (auth.uid() = user_id);

-- AI Feedback: users see only their own feedback
CREATE POLICY "Users can view own feedback"
  ON public.ai_feedback FOR SELECT USING (auth.uid() = user_id);

-- Streaks: users see only their own streak
CREATE POLICY "Users can view own streak"
  ON public.streaks FOR ALL USING (auth.uid() = user_id);

-- =============================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================

-- Auto-create profile + streak row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::TEXT, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 8))
  );
  INSERT INTO public.streaks (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================
-- VIEWS
-- =============================================================

-- User stats summary view (used by dashboard)
CREATE VIEW public.user_stats AS
SELECT
  p.id,
  p.username,
  p.total_xp,
  p.subscription_tier,
  p.country_code,
  s.current_streak,
  s.longest_streak,
  COUNT(DISTINCT er.id) AS total_exams_completed,
  AVG(er.overall_score) AS avg_score,
  MAX(er.overall_score) AS best_score,
  MAX(er.created_at) AS last_exam_date
FROM public.profiles p
LEFT JOIN public.streaks s ON s.user_id = p.id
LEFT JOIN public.exam_results er ON er.user_id = p.id
GROUP BY p.id, p.username, p.total_xp, p.subscription_tier, p.country_code,
         s.current_streak, s.longest_streak;
