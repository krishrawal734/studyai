# StudyAI 🧠 · AI Study Assistant Mobile Application

> **Application Developed by Krish Rawal**
> An AI-powered study companion built with **Expo SDK 58**, **Expo Router**, **NativeWind v4**, **React Native Reanimated**, and **Zustand**. Transform lecture notes, photos, and documents into high-yield summaries, 3-box Leitner spaced-repetition flashcards, and active-recall quizzes.

---

## 📖 What It Is

**StudyAI** is a student-centric mobile application designed to eliminate passive studying. Rather than re-reading static notes, students add material in any format—typed notes, textbook photos, whiteboard scans, or document files—and the application produces:
1. **Executive Summaries & Key Takeaways**: High-yield concepts extracted for rapid review.
2. **Spaced Repetition Flashcards**: Active-recall card decks driven by the **3-Box Leitner System**.
3. **Adaptive Quizzes**: Multiple-choice assessments with instant explanations, score tracking, and a **"Retry Only Wrong Answers"** focus mode.
4. **Habit & Streak Tracking**: Daily calendar-synced study streaks, milestone badges, daily card targets, and scheduled local push notifications.

### 🔒 100% Frontend-Only & Private by Design
- **No external accounts or cloud logins required**: Everything is stored directly on the user's device via `@react-native-async-storage/async-storage`.
- **Zero API keys exposed in the client**: Features an isolated, swappable AI Service Architecture (`AIService`) using topic-aware realistic mock algorithms, pre-wired for seamless backend proxy integration.
- **Strict Zod Runtime Validation**: Every AI response is validated through Zod schemas before reaching the UI state.

---

## ✨ Features

### 1. Multi-Modal Note Ingestion
- **Text Notes**: Direct note pasting or typing with character count and demo quick-load chips (*Photosynthesis*, *Sorting Algorithms*, *Simulated Error*).
- **Photo Note Scanner**: Capture photos directly via camera (`expo-image-picker`) or import from photo gallery. Client-side image compression (`expo-image-manipulator`) automatically scales images to a 1200px boundary at 0.75 JPEG quality.
- **Document Picker**: Select PDF or text files (`expo-document-picker`) with dynamic byte formatting and file metadata previews.

### 2. Spaced Repetition Flashcards & Gesture Physics
- **3D Perspective Flip Animation**: Built with `react-native-reanimated` (`rotateY` interpolation, 1000px perspective, and backface visibility culling).
- **Tinder/Anki-Style Physical Swipe Gestures**: Smooth horizontal card swiping with dynamic rotation tilt:
  - Swipe Right (> 110px): Green "GOT IT ✓" badge moves card to mastered box.
  - Swipe Left (< -110px): Red "REVIEW AGAIN ⚡" badge keeps card in Box 1 for review.
- **Native Text-to-Speech (TTS) Audio**: Integrated `expo-speech` audio reader with speaker button (🔊/🔈) for hands-free audio studying of cards and set summaries.
- **Advanced Study Modes**:
  - 🔀 **Shuffle Mode**: Randomize flashcard study order on demand.
  - 🔄 **Reversed Mode**: Swap Questions and Answers (A ⇄ Q) to test bidirectional recall.
  - ⭐ **Starred Filter**: Bookmark difficult cards with 1-tap and study only bookmarked items.
- **In-Place Card Management**:
  - ➕ **Add Card**: Manually append custom question/answer cards to any deck.
  - ✏️ **Edit Card**: Edit questions and answers in-place with instant store sync.
- **Leitner Review Intervals**:
  - **Box 1 (Daily)**: New or challenging cards reviewed every 24 hours.
  - **Box 2 (3 Days)**: Familiar cards reviewed every 72 hours.
  - **Box 3 (Mastered · 7 Days)**: Solidified long-term memory reviewed weekly.
- **Deck Filtering**: Practice *All Cards*, or target specific boxes (*Box 1*, *Box 2*, or *Box 3*).
- **Completion Breakdown**: Post-session accuracy report, Leitner distribution counters, and instant 1-tap *"Review Only Box 1"* focus mode.

### 3. Built-In Pomodoro Focus Timer
- **25-Minute Focus Countdown**: Dedicated Pomodoro modal accessible directly during flashcard study.
- **Circular Progress Meter & Controls**: Visual progress ring, Play/Pause toggle, and Reset.
- **Automated Study Logging**: Automatically logs 25 minutes to daily stats on session completion with celebratory haptic feedback.

### 4. Deck Export, Sharing & Import
- **Native Share Sheet (JSON)**: Export any study set with one tap (`expo-sharing` & `expo-file-system`) to AirDrop, WhatsApp, Drive, email, or local files.
- **Deck Importer**: Import shared `.json` study files via native document picker with structural validation, generating fresh decks with cards, summaries, and quizzes.

### 5. Adaptive Multiple-Choice Quizzes
- **Interactive Option Selection**: Letter badges (A, B, C, D) with distinct active, correct, and incorrect states.
- **Instant Explanations**: Immediate feedback with pedagogical rationales for why each answer is correct or incorrect.
- **Retry Missed Answers Focus Mode**: Re-filter and re-take only the questions missed during the first attempt, preventing redundant review.
- **Question Breakdown Drawer**: Expandable question-by-question review of all user choices versus correct answers.

### 6. Streak Engine & Habit Protection (Streak Freezes)
- **Calendar-Aware Consecutive Day Streak**: Evaluates local device date roll-overs; automatically checks streak integrity on app open without erasing all-time personal bests.
- **Streak Shield & Habit Protection (Freezes)**:
  - Banked streak freezes (default: 2, claimable in settings) automatically prevent streak loss if a student misses a single study day.
  - Dedicated "🛡️ Streak Shield" indicator badge on Home and protective notification when a freeze saves a streak.
- **Micro-Animations & Milestones**: Reanimated bouncing flame, celebratory badge animations on streak expansion, and milestone progress tracking (🥉 *Pioneer 3d*, 🥈 *Champion 7d*, 🥇 *Scholar 14d*, 🏆 *Master 30d*).
- **Weekly Activity Row**: Visual 7-day row with checkmark indicators for completed study days.
- **Daily Study Target**: Visual goal progress bar (10 cards/day target) tracking cards and minutes studied today.
- **Spaced Repetition Due Queue**: Prominent dashboard banner identifying cards due for spaced review today with a 1-tap route directly into practice.

### 7. Study Library & Management
- **Full-Text Live Search**: Search across titles, summaries, subjects, questions, and answers simultaneously.
- **Deck Importer**: Import shared `.studyai.json` files directly into your library with 1 tap.
- **Subject Categorization**: Filter by subjects (*Computer Science*, *Biology*, *History*, *Physics*, etc.) with live deck counters.
- **Multi-Option Sorting**: Sort by *Newest*, *Oldest*, *Alphabetical (A-Z)*, or *Most Cards*.
- **In-Place Rename & Edit**: Quick modal to rename study sets or reassign subject categories.
- **Safe Deletion**: Confirmed deletion dialog with destructive styling and haptic warnings.

### 8. Progress Analytics & Visual Charts
- **7-Day Study Activity Bar Chart**: NativeWind flexbox column chart plotting daily cards studied over the last 7 calendar days with proportional height scaling.
- **Leitner Mastery Distribution Meter**: Multi-segmented visual progress bar displaying percentage and counts across Box 1, Box 2, and Box 3.
- **Quiz Accuracy Trend**: Bar graph visualization plotting scores across recent quiz attempts.
- **Chronological Session Log**: Lifetime study history log recording dates, study minutes, cards reviewed, and quiz percentages.

### 9. Scheduled Local Push Notifications
- Configured via `expo-notifications` with Android notification channels (`study-reminders`).
- Scheduled daily recurring reminders at customizable times (`08:00 AM`, `02:00 PM`, `06:00 PM`, `08:00 PM`, `09:30 PM`).
- In-app **Instant Test Trigger** to immediately verify device notification delivery.

### 10. Theming, Audio TTS, Haptics & Accessibility
- **Native Text-to-Speech (TTS)**: `expo-speech` audio playback with pronunciation controls for summaries and flashcards.
- **Dark Mode**: NativeWind v4 class-based dark styling across all screens and components.
- **Appearance Switcher**: Instant switching between *System*, *Light*, and *Dark* modes.
- **Global Tactile Haptics**: Subtle vibrations on button taps, card flips, swipes, quiz submissions, and deletions.
- **Accessibility**: Minimum 44px touch targets, accessible roles (`button`, `switch`), and screen reader labels.

---

## 🛠 Tech Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Expo SDK | `~58.0.22` | Universal React Native application platform |
| **Routing** | Expo Router | `~58.0.29` | File-based navigation with typed routes |
| **Runtime** | React Native / React | `0.88.1` / `19.3.0` | Core mobile UI rendering engine |
| **Styling** | NativeWind / Tailwind CSS | `^4.2.7` / `^3.4.17` | Utility-first styling with `dark:` variants |
| **State & Persistence** | Zustand | `^5.0.16` | Persisted client stores with version migrations |
| **Storage Engine** | AsyncStorage | `2.2.0` | Local disk key-value storage engine |
| **Forms & Validation** | React Hook Form + Zod | `^7.91.0` / `^4.6.7` | Type-safe form validation and schema parsing |
| **Animations & Gestures** | React Native Reanimated + PanResponder | `4.7.1` | 3D perspective flip, spring bounces, and Tinder card swipes |
| **Speech & Audio** | Expo Speech | `~58.0.3` | Native text-to-speech audio narration |
| **File Sharing** | Expo Sharing & File System | `~58.0.21` / `~58.0.13` | Study deck JSON export and system share sheet |
| **Media & Hardware** | Expo Camera & Image Picker | `~58.0.10` | Photo capture and gallery selection |
| **Image Compression** | Expo Image Manipulator | `~58.0.16` | Client-side JPEG downsampling and scaling |
| **File Import** | Expo Document Picker | `~58.0.4` | Text and PDF document import |
| **Feedback** | Expo Haptics | `~58.0.7` | Hardware tactile vibration feedback |
| **Notifications** | Expo Notifications | `~58.1.7` | Scheduled daily recurring local reminders |
| **Date Utilities** | date-fns | `^4.4.0` | Immutable calendar and streak date calculations |

---

## 🏗 Architecture Note: The Swappable AI Layer

StudyAI decouples user interaction from AI generation via an interface contract pattern located in `src/services/ai/`. The application never makes direct unvalidated calls to proprietary APIs.

```
┌────────────────────────────────────────────────────────┐
│                   React Native UI                      │
│      (useCreateStudySet Hook / react-hook-form)        │
└──────────────────────────┬─────────────────────────────┘
                           │ calls AIService methods
                           ▼
┌────────────────────────────────────────────────────────┐
│                   AIService Contract                   │
│   • summarize(input: StudyInput): Promise<Summary>     │
│   • generateFlashcards(input): Promise<Flashcards>     │
│   • generateQuiz(input): Promise<Quiz>                 │
└──────────────┬──────────────────────────┬──────────────┘
               │                          │
   EXPO_PUBLIC_USE_MOCK_AI=true           │ EXPO_PUBLIC_USE_MOCK_AI=false
               │                          │
               ▼                          ▼
┌──────────────────────────────┐   ┌────────────────────────────────┐
│        MockAIService         │   │         RealAIService          │
│ • Keyword & sentence parsing │   │ • Proxies request to backend   │
│ • Realistic 1.8-2.6s latency │   │ • Keeps API keys on server     │
│ • Error simulation test hook │   │ • Validates response with Zod  │
└──────────────┬───────────────┘   └──────────────┬─────────────────┘
               │                                  │
               └─────────────────┬────────────────┘
                                 │ validates data
                                 ▼
┌────────────────────────────────────────────────────────┐
│                  Zod Runtime Schemas                   │
│   • summaryResponseSchema                              │
│   • flashcardsResponseSchema                           │
│   • quizResponseSchema                                 │
└────────────────────────────────────────────────────────┘
```

### Why this pattern matters:
1. **Zero Secret Leakage**: Mobile client applications should **never** bundle private LLM API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`, etc.). Keys stored in mobile binaries can be decompiled in seconds.
2. **Instant Testability**: Developers can test every edge case (loading skeletons, progressive progress messages, network failures, retry flows) offline without incurring API costs.
3. **Seamless Production Hand-off**: Switching to a live server takes a single environment variable change (`EXPO_PUBLIC_USE_MOCK_AI=false`).

---

## 📁 Folder Structure

```
studyai/
├── app.json                          # Expo configuration & notification plugins
├── babel.config.js                   # Babel config with NativeWind preset
├── global.css                        # Tailwind CSS root entry
├── metro.config.js                   # Metro bundler with NativeWind transformer
├── tailwind.config.js                # StudyAI theme color tokens & radius scale
├── tsconfig.json                     # Strict TypeScript configuration
│
├── src/
│   ├── app/                          # Expo Router file-based screens
│   │   ├── _layout.tsx               # Root layout: Theme provider, StatusBar, stack
│   │   ├── index.tsx                 # Onboarding gatekeeper redirect
│   │   ├── onboarding.tsx            # 3-slide visual onboarding walkthrough
│   │   ├── (tabs)/                   # 5-tab main navigator
│   │   │   ├── _layout.tsx           # Tab bar styling & active icons
│   │   │   ├── index.tsx             # Home dashboard: Streaks, goals, due queue
│   │   │   ├── library.tsx           # Search, subject filter, rename, delete
│   │   │   ├── create.tsx            # Multi-modal note creation (text, photo, file)
│   │   │   ├── progress.tsx          # Analytics, 7-day bar chart, Leitner stats
│   │   │   └── settings.tsx          # Appearance, notifications, reset, about
│   │   └── set/
│   │       └── [id]/
│   │           ├── _layout.tsx       # Set header & segmented top tabs
│   │           ├── index.tsx         # Summary & key learning points
│   │           ├── flashcards.tsx    # 3D flip card session & Leitner controls
│   │           └── quiz.tsx          # Multiple choice quiz & retry wrong answers
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── Button.tsx                # Accessible tactile button with variants & sizes
│   │   ├── Card.tsx                  # Rounded container with dark mode borders
│   │   ├── Chip.tsx                  # Subject and filter chips
│   │   ├── EmptyState.tsx            # Empty screen placeholder with call-to-action
│   │   ├── ErrorView.tsx             # Error callout with retry action
│   │   ├── FlashCard.tsx             # Reanimated 3D flip card component
│   │   ├── Input.tsx                 # Styled text input with clear button & helper
│   │   ├── LoadingSkeleton.tsx       # Shimmer loading placeholder
│   │   ├── ProgressBar.tsx           # Animated progress bar
│   │   ├── QuizOption.tsx            # Interactive quiz answer choice
│   │   └── StreakCard.tsx            # Animated flame, milestones & weekly row
│   │
│   ├── constants/
│   │   └── theme.ts                  # Brand colors, subjects, Leitner intervals
│   │
│   ├── hooks/
│   │   ├── useCreateStudySet.ts      # React Hook Form + Zod set generation flow
│   │   ├── useFlashcardSession.ts    # Leitner 3-box state & session scoring
│   │   ├── useQuizSession.ts         # Quiz answer validation & wrong answers mode
│   │   └── useLibrary.ts             # Search, sort, rename modal, delete dialog
│   │
│   ├── services/
│   │   └── ai/
│   │       ├── types.ts              # AIService TypeScript interface
│   │       ├── schemas.ts            # Zod validation schemas
│   │       ├── mockAIService.ts      # Topic-aware realistic extractor & delay
│   │       ├── realAIService.ts      # Production backend proxy template
│   │       └── index.ts              # Service factory & mock toggle
│   │
│   ├── store/
│   │   ├── useSetStore.ts            # Persisted study sets, cards, and quizzes
│   │   ├── useStatsStore.ts          # Persisted streaks, history, and daily goals
│   │   └── useSettingsStore.ts       # Persisted theme, reminder time, onboarding
│   │
│   ├── types/
│   │   └── index.ts                  # Global domain types (StudySet, Card, Quiz)
│   │
│   └── utils/
│       ├── media.ts                  # Image compression & safe haptics
│       ├── notifications.ts          # Scheduled notifications & permissions
│       └── index.ts                  # Date formatting and Leitner calculation
```

---

## 🚀 Setup and Run

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `bun` package manager
- [Expo Go](https://expo.dev/go) app on your iOS or Android physical device (or Xcode / Android Studio simulator)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/studyai.git
cd studyai
npm install
```

### 2. Start the Development Server
```bash
npx expo start
```

### 3. Open on Your Device or Emulator
- **Physical Device**: Scan the QR code displayed in your terminal using the Camera app (iOS) or the Expo Go app (Android).
- **iOS Simulator**: Press `i` in the terminal.
- **Android Emulator**: Press `a` in the terminal.
- **Web Browser**: Press `w` in the terminal.

### 4. Run Code Quality Checks
```bash
# TypeScript strict type checking
npx tsc --noEmit

# ESLint check
npm run lint
```

---

## 📸 Screenshots

| 1. Onboarding Walkthrough | 2. Home Dashboard & Streaks | 3. Create Multi-Modal Set |
| :---: | :---: | :---: |
| ![Onboarding Screen](https://raw.githubusercontent.com/placeholder/studyai/main/screenshots/onboarding.png) | ![Home Dashboard](https://raw.githubusercontent.com/placeholder/studyai/main/screenshots/home.png) | ![Create Study Set](https://raw.githubusercontent.com/placeholder/studyai/main/screenshots/create.png) |

| 4. 3D Flashcard Flip | 5. Quiz & Wrong Answers Retry | 6. Progress Analytics & Dark Mode |
| :---: | :---: | :---: |
| ![Flashcard Flip](https://raw.githubusercontent.com/placeholder/studyai/main/screenshots/flashcards.png) | ![Quiz Mode](https://raw.githubusercontent.com/placeholder/studyai/main/screenshots/quiz.png) | ![Progress Dark Mode](https://raw.githubusercontent.com/placeholder/studyai/main/screenshots/progress-dark.png) |

---

## 🗺 Roadmap: Connect a Real AI Backend

When ready to connect StudyAI to a live production LLM (e.g. OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, or Google Gemini 2.5 Flash), follow this 4-step deployment pattern:

### Step 1: Deploy a Backend Proxy
Create a lightweight server (Node.js/Express, Next.js API Routes, or FastAPI). Store your secret API keys safely in the backend environment.

```typescript
// Example Express / Next.js API Route (/api/study/generate)
import { OpenAI } from 'openai';
import { z } from 'zod';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { title, subject, content } = await req.json();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are an expert tutor. Analyze the study material and output JSON with:
          - title: string
          - summary: string
          - keyPoints: string[]
          - cards: [{ question: string, answer: string }]
          - questions: [{ question: string, options: [string, string, string, string], correctIndex: number, explanation: string }]`
      },
      { role: 'user', content: `Subject: ${subject}\n\n${content}` }
    ]
  });

  return Response.json(JSON.parse(completion.choices[0].message.content));
}
```

### Step 2: Configure Environment Variables
Create a `.env` file in the StudyAI mobile root:
```env
EXPO_PUBLIC_USE_MOCK_AI=false
EXPO_PUBLIC_API_URL=https://your-backend-api.com/api
```

### Step 3: Complete `src/services/ai/realAIService.ts`
The template file is already prepared in the project. Update the `fetch` endpoints to target your backend URL:
```typescript
// src/services/ai/realAIService.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.yourdomain.com';

export const realAIService: AIService = {
  async summarize(input) {
    const res = await fetch(`${BASE_URL}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await res.json();
    return summaryResponseSchema.parse(json);
  },
  // flashcards and quiz follow the exact same verified contract
};
```

---

## 💡 What I Learned

Building StudyAI provided valuable real-world engineering insights across the modern React Native and Expo ecosystem:

1. **NativeWind v4 Mental Model**:
   NativeWind v4 replaces legacy Babel transformers with a modern CSS Interop engine and Metro plugin (`withNativeWind`). Managing class-based dark mode through `useColorScheme` from `nativewind` provides instantaneous, flicker-free theme switches across deep component trees without wrapping the tree in heavy context providers.

2. **Zustand Persistence & Schema Migrations**:
   Persisting Zustand stores with `createJSONStorage(() => AsyncStorage)` requires careful version management. Defining explicit `version: 1` and `migrate()` functions guarantees that if domain models evolve (e.g. adding Leitner intervals or tracking session history), existing user data will not corrupt on app launch.

3. **Runtime Schema Verification with Zod**:
   TypeScript types only enforce contracts at compile time. Validating AI outputs with Zod schemas at runtime guarantees that missing fields, unexpected response shapes, or malformed quiz arrays are caught gracefully by the UI layer before causing runtime crashes.

4. **Hardware Acceleration with Reanimated**:
   Creating a 3D perspective flip card requires understanding rotation interpolation and backface culling on mobile GPU pipelines. Using Reanimated's `perspective: 1000` combined with `rotateY` shared values produces 60fps native animations without dropping frames on low-powered devices.

5. **Cross-Platform Graceful Degradation**:
   Mobile-first APIs like `expo-haptics` and `expo-notifications` behave differently across iOS, Android, and Web previews. Creating safe wrapper utilities ensures that features execute smoothly on physical mobile hardware while never throwing unsupported platform exceptions in browser previews or test runners.

---

## 📄 License

This project is licensed under the MIT License — feel free to use it for personal learning or as a foundation for your own AI study assistant.
