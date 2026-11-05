export type LeitnerBox = 1 | 2 | 3;

export type SourceType = 'text' | 'image' | 'file';

export interface Card {
  id: string;
  question: string;
  answer: string;
  box: LeitnerBox;
  nextReview: string; // ISO date string
  lastReviewed?: string;
  starred?: boolean;
  highYield?: boolean; // Predicted as high-probability for exams
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
  lastScore: number | null;
  attempts: number;
  lastAttemptAt?: string;
}

export interface PodcastLine {
  speaker: 'Host' | 'Student';
  text: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  summary?: string;
  children?: MindMapNode[];
}

export interface StudySet {
  id: string;
  title: string;
  subject: string;
  summary: string;
  keyPoints: string[];
  createdAt: string; // ISO date string
  sourceType: SourceType;
  cards: Card[];
  quizzes: Quiz[];
  imageUri?: string;
  fileName?: string;
  fileSize?: number;
  examDate?: string | null; // YYYY-MM-DD
  podcastScript?: PodcastLine[];
  mindMap?: MindMapNode;
}

export type AITutorMode = 'eli5' | 'mnemonic' | 'example' | 'custom';

export interface AITutorResponse {
  answer: string;
  mnemonic?: string;
  keyTakeaway?: string;
}

export interface AnswerGradeResponse {
  score: number; // 0 to 100
  feedback: string;
  nailed: string[];
  missing: string[];
  suggestedBox: LeitnerBox;
}

export interface WeakSpotDiagnosis {
  diagnosis: string;
  focusTopic: string;
  cards: { question: string; answer: string }[];
  quizzes: {
    question: string;
    options: [string, string, string, string];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlockedAt: string | null; // ISO date string or null
  category: 'streak' | 'cards' | 'quiz' | 'mastery' | 'sets' | 'special';
  requirement: number;
}

export interface StudyHistoryEntry {
  date: string; // YYYY-MM-DD
  cardsStudied: number;
  minutesStudied: number;
  quizScores: number[];
}

export interface Stats {
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null; // YYYY-MM-DD
  history: StudyHistoryEntry[];
  streakFreezes: number;
  freezesUsed: number;
  streakProtectedByFreeze?: boolean;
  xp: number;
  level: number;
  badges: AchievementBadge[];
}

export type AppTheme = 'system' | 'light' | 'dark';

export interface Settings {
  theme: AppTheme;
  reminderTime: string | null; // e.g. "20:00"
  reminderEnabled: boolean;
  onboardingDone: boolean;
  geminiApiKey: string | null;
  useRealAI: boolean;
}
