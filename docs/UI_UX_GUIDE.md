# Examify — UI/UX Design Guide

---

## Design Philosophy

Examify combines three design languages:
- **Duolingo's engagement** — streaks, XP, celebrations, micro-rewards
- **Notion's clarity** — information hierarchy, purposeful whitespace
- **ChatGPT's approachability** — AI feedback feels like a tutor, not a machine

The core principle: **Every screen should answer "what do I do next?"** immediately.

---

## Color System

### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| Primary Purple | `#6C47FF` | CTAs, active states, brand accents |
| Teal | `#00D4AA` | Success, progress, daily challenge |
| Amber | `#FFA502` | Streaks, warnings, fire indicators |
| Red | `#FF4757` | Errors, time running out, incorrect answers |

### Dark Mode

The app ships with full dark mode support. All colors are defined as semantic tokens (`theme.background`, `theme.text`, etc.) and switch automatically based on device system preference.

Dark mode values:
- Background: `#0F0F1A` (near-black with a purple tint)
- Cards: `#1A1A2E` (slightly lighter, visible in dark)
- Text: `#FFFFFF` primary, `#9299B8` secondary

### IELTS Band Score Colors

Band scores are color-coded to give instant visual feedback:

| Band | Color | Meaning |
|------|-------|---------|
| 1-2 | Red `#FF4757` | Needs significant work |
| 3-4 | Orange `#FF6B35` / Amber `#FFA502` | Below intermediate |
| 5-6 | Yellow-green `#A3CB38` | Intermediate |
| 7 | Teal `#00D4AA` | Upper intermediate (C1) |
| 8-9 | Purple `#6C47FF` | Expert level |

---

## Screen Flows

### New User Journey

```
App Open
   │
   ▼
Splash Screen (logo + purple gradient, 1.5s)
   │
   ▼
Onboarding Slides (3 slides, swipeable)
   │  Slide 1: "Pass any language exam faster" (hero image)
   │  Slide 2: "AI scores your writing & speaking"
   │  Slide 3: "Practice 10 minutes a day"
   │
   ▼
Sign Up Screen
   │
   ▼
Email Verification (show "Check your inbox" screen)
   │
   ▼
Onboarding Wizard (3 steps)
   │  Step 1: "Which exam are you preparing for?" (IELTS/TEF/TCF/DALF)
   │  Step 2: "What's your target score?" (slider)
   │  Step 3: "When is your exam?" (date picker) + country selection
   │
   ▼
Home Dashboard
```

### Mock Exam Flow

```
Home → Tap "Start Exam"
   │
   ▼
Exam Details Screen
   • Title, difficulty, duration, skills covered
   • "Start Free Mock" or "Upgrade to Pro" (gated)
   │
   ▼ Tap "Start"
   │
   ▼
[For Listening Sections]
Audio Player (auto-plays at section start)
   │
   ▼
Question Screen
   • Progress bar at top (shows % of exam complete)
   • Timer (top right — turns amber < 5min, red < 1min)
   • Question text
   • Answer options (MCQ) OR text input (fill-blank)
      OR writing editor (essay) OR audio recorder (speaking)
   • "Next →" button (disabled until answer selected)
   │
   ▼ After last question
   │
   ▼
Completion animation (confetti burst, haptic feedback)
   │
   ▼
Results Screen
```

### Results Screen Flow

```
Results Screen
   │
   ├── Tab 1: Overview
   │   • Big score number (colored by band)
   │   • 4 skill score cards (Reading, Listening, Writing, Speaking)
   │   • Strong areas (green chips)
   │   • Weak areas (red chips)
   │
   ├── Tab 2: AI Feedback
   │   • Criteria breakdown (e.g., Task Response: 7.0, Coherence: 6.5)
   │   • Examiner feedback text
   │   • Model answer excerpt
   │   • If still processing: "AI is scoring your answer..." with spinner
   │
   └── Tab 3: Improvement
       • Personalized action steps based on weak areas
       • "Practice [weak area]" quick links
   │
   ▼ Bottom buttons:
   • "Practice Again →" (goes to exam list)
   • "Share My Result 📤" (native share sheet)
```

---

## Key UI Components

### Streak Card (Home Screen)

The streak card is the most emotionally important UI element — it's the primary engagement mechanic.

```
┌─────────────────────────────────────────────┐
│  🔥   12          Best: 21 days             │
│       day streak  ✓ Done today              │
└─────────────────────────────────────────────┘
```

**States:**
- **Normal (streak going):** Purple accent, flame emoji, streak count
- **At risk (< 4 hours left):** Amber border and text, warning ⚠️ message
- **Done today:** Green "✓ Done today" badge — feels rewarding
- **Streak broken:** Muted colors, "Start a new streak!" message

### Exam Timer

Three visual states with color coding to create urgency:

| Time | Color | Behavior |
|------|-------|----------|
| > 5 minutes | Purple | Normal |
| 1-5 minutes | Amber | Slight pulse animation |
| < 1 minute | Red | Faster pulse, haptic warning |

### Question Option Buttons

MCQ options are large tap targets (min 48pt height) with clear selected state:

```
Unselected:          Selected:
┌──────────────┐     ┌──────────────┐
│ ○ A  Option  │     │ ● A  Option  │  ← Purple border
│   text here  │     │   text here  │  ← Purple background tint
└──────────────┘     └──────────────┘
```

The option letter bubble fills with purple when selected. No green/red feedback during the exam — only after completion (prevents answer-fishing).

### AI Feedback Card

The feedback feels like a real examiner wrote it, not a robot:

```
┌─────────────────────────────────────────┐
│ 📋 Examiner Feedback                    │
│                                         │
│ This response addresses the task well   │
│ with a clear position maintained        │
│ throughout. Your use of academic        │
│ vocabulary is particularly strong...    │
│                                         │
│ Criteria:                               │
│  Task Response        7.0  ████████░░  │
│  Coherence            6.5  ███████░░░  │
│  Lexical Resource     7.0  ████████░░  │
│  Grammar              7.0  ████████░░  │
└─────────────────────────────────────────┘
```

---

## Animation Principles

**Use animation to:**
- Celebrate progress (exam completion, streak milestone, level up)
- Indicate loading states (skeleton screens, spinner)
- Guide attention (new feature highlight, tooltip)
- Give feedback (correct answer sparkle, incorrect shake)

**Don't use animation for:**
- Navigation transitions (keep them fast and instant)
- Every tap (over-animation feels cheap)
- Anything the user has to wait for

**Libraries used:**
- `react-native-reanimated` for smooth JS-thread animations
- `expo-haptics` for tactile feedback (very important — makes the app feel premium)

**Key animation moments:**
```
Exam completion → Confetti burst + success haptic
Streak milestone → Special celebration screen (7, 30, 100 days)
Correct answer  → Small green checkmark fade-in + light haptic
Wrong answer    → Gentle shake + error haptic
XP gained       → Number counter animation (+70 XP)
```

---

## Mobile-First Considerations

### Thumb Zone Design

All primary actions (Next button, record button, option selection) are in the bottom 60% of the screen — reachable with one thumb.

### Offline Support

Core exam-taking works offline:
- Exam content downloaded to device on start
- Answers saved locally (Redux persist + AsyncStorage)
- Synced to server when connection restored

AI scoring requires internet connection — shown as pending until reconnected.

### Large Text / Accessibility

- Minimum font size: 14pt (body), 12pt (labels)
- All interactive elements: minimum 44pt tap target
- Color is never the only differentiator (icons + labels accompany color states)
- VoiceOver / TalkBack labels on all custom components

### Dark Mode

The dark mode was designed first — the app is used late at night by students studying, so dark mode is critical for eye comfort and battery life.

---

## Onboarding UX Strategy

**Goal:** Get users to their first successful practice session within 3 minutes of installing.

**Anti-patterns avoided:**
- No mandatory email verification before first use (verify asynchronously)
- No paywall on first open — show value first
- No overwhelming feature tour — learn by doing

**What we do instead:**
1. 3 fast onboarding slides (< 30 seconds)
2. Quick signup (email + password only — name is optional)
3. One question: "Which exam?" — then straight to home
4. First exam is always free — no subscription wall at first use
5. Subscription prompt only after user completes their first exam

The subscription prompt comes at peak emotional moment: right after the user sees their first AI-scored result. "Want unlimited practice + full AI feedback? Upgrade for $7.99/month."
