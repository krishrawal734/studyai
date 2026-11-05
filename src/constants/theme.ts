export const COLORS = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
    DEFAULT: '#4F46E5',
  },
  streak: {
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    dark: '#B45309',
  },
  success: {
    light: '#D1FAE5',
    DEFAULT: '#10B981',
    dark: '#047857',
  },
  error: {
    light: '#FEE2E2',
    DEFAULT: '#EF4444',
    dark: '#B91C1C',
  },
  surface: {
    light: '#FFFFFF',
    subtle: '#F8FAFC',
    muted: '#F1F5F9',
    border: '#E2E8F0',
    dark: '#0F172A',
    darkSubtle: '#1E293B',
    darkMuted: '#334155',
    darkBorder: '#475569',
  },
} as const;

export const DEFAULT_SUBJECTS = [
  'General',
  'Computer Science',
  'Biology',
  'History',
  'Physics',
  'Chemistry',
  'Mathematics',
  'Literature',
  'Psychology',
] as const;

export const LEITNER_INTERVALS_DAYS = {
  1: 1, // Box 1: review daily
  2: 3, // Box 2: review every 3 days
  3: 7, // Box 3: review every week (mastered)
} as const;
