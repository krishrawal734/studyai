import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, subDays, isSameDay, parseISO } from 'date-fns';
import { Stats, StudyHistoryEntry, AchievementBadge } from '../types';

export const INITIAL_BADGES: AchievementBadge[] = [
  {
    id: 'first_set',
    title: 'First Step',
    description: 'Created your first study set',
    emoji: '🎓',
    unlockedAt: null,
    category: 'sets',
    requirement: 1,
  },
  {
    id: 'streak_3',
    title: 'Habit Builder',
    description: 'Achieved a 3-day study streak',
    emoji: '🔥',
    unlockedAt: null,
    category: 'streak',
    requirement: 3,
  },
  {
    id: 'streak_7',
    title: 'Unstoppable',
    description: 'Maintained a 7-day study streak',
    emoji: '⚡',
    unlockedAt: null,
    category: 'streak',
    requirement: 7,
  },
  {
    id: 'perfect_quiz',
    title: 'Perfectionist',
    description: 'Scored 100% on any quiz',
    emoji: '🧠',
    unlockedAt: null,
    category: 'quiz',
    requirement: 100,
  },
  {
    id: 'cards_25',
    title: 'Card Explorer',
    description: 'Reviewed 25 total flashcards',
    emoji: '🃏',
    unlockedAt: null,
    category: 'cards',
    requirement: 25,
  },
  {
    id: 'cards_100',
    title: 'Flashcard Veteran',
    description: 'Reviewed 100 total flashcards',
    emoji: '💎',
    unlockedAt: null,
    category: 'cards',
    requirement: 100,
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Completed a study session after 9:00 PM',
    emoji: '🌙',
    unlockedAt: null,
    category: 'special',
    requirement: 21,
  },
  {
    id: 'master_10',
    title: 'Memory Master',
    description: 'Moved 10 cards to Leitner Box 3',
    emoji: '🏆',
    unlockedAt: null,
    category: 'mastery',
    requirement: 10,
  },
];

export function calculateLevel(xp: number): { level: number; currentXP: number; maxXP: number; progress: number } {
  const level = Math.floor(xp / 100) + 1;
  const currentXP = xp % 100;
  const maxXP = 100;
  const progress = currentXP / maxXP;
  return { level, currentXP, maxXP, progress };
}

export interface StatsState extends Stats {
  streakJustGrew: boolean;
  recentXPGained: number;
  recentLevelUp: boolean;
  recordSession: (cardsCount: number, minutesCount: number, quizScore?: number) => void;
  addXP: (amount: number) => { leveledUp: boolean; newLevel: number };
  unlockBadge: (badgeId: string) => boolean;
  checkMilestoneBadges: (setsCount: number, masteredCount: number) => string[];
  clearLevelUpFlag: () => void;
  checkStreakIntegrity: () => void;
  clearStreakGrewFlag: () => void;
  clearStreakProtectedFlag: () => void;
  addStreakFreeze: (count?: number) => void;
  resetStats: () => void;
}

const STATS_STORAGE_KEY = 'studyai_stats_v1';
const STORE_VERSION = 2;

export const useStatsStore = create<StatsState>()(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      history: [],
      streakJustGrew: false,
      streakFreezes: 2, // 2 Freezes provided to every student
      freezesUsed: 0,
      streakProtectedByFreeze: false,
      xp: 0,
      level: 1,
      badges: INITIAL_BADGES,
      recentXPGained: 0,
      recentLevelUp: false,

      /**
       * Checks whether the current streak has expired due to missed days.
       * If user missed 1 day and has a streak freeze available, it automatically protects the streak!
       */
      checkStreakIntegrity: () => {
        const state = get();
        if (!state.lastStudyDate || state.currentStreak === 0) return;

        const todayDate = parseISO(format(new Date(), 'yyyy-MM-dd'));
        const lastDate = parseISO(state.lastStudyDate);

        // Valid if studied today or yesterday
        const studiedToday = isSameDay(lastDate, todayDate);
        const studiedYesterday = isSameDay(lastDate, subDays(todayDate, 1));

        if (studiedToday || studiedYesterday) {
          return;
        }

        // Missed yesterday: Check if 1 day was missed and we have a freeze available
        const missedJustOneDay = isSameDay(lastDate, subDays(todayDate, 2));
        if (missedJustOneDay && state.streakFreezes > 0) {
          // Consume 1 streak freeze and save the streak
          const yesterdayStr = format(subDays(todayDate, 1), 'yyyy-MM-dd');
          set({
            streakFreezes: state.streakFreezes - 1,
            freezesUsed: state.freezesUsed + 1,
            lastStudyDate: yesterdayStr,
            streakProtectedByFreeze: true,
          });
          return;
        }

        // Streak expired
        set({ currentStreak: 0, streakProtectedByFreeze: false });
      },

      clearStreakGrewFlag: () => set({ streakJustGrew: false }),
      clearStreakProtectedFlag: () => set({ streakProtectedByFreeze: false }),
      clearLevelUpFlag: () => set({ recentLevelUp: false }),

      addStreakFreeze: (count = 1) => {
        set((state) => ({ streakFreezes: state.streakFreezes + count }));
      },

      addXP: (amount: number) => {
        const state = get();
        const oldLevel = state.level;
        const newXP = state.xp + amount;
        const newLevel = Math.floor(newXP / 100) + 1;
        const leveledUp = newLevel > oldLevel;

        set({
          xp: newXP,
          level: newLevel,
          recentXPGained: amount,
          recentLevelUp: leveledUp,
        });

        return { leveledUp, newLevel };
      },

      unlockBadge: (badgeId: string) => {
        const state = get();
        const badgeIndex = state.badges.findIndex((b) => b.id === badgeId);
        if (badgeIndex === -1) return false;

        const target = state.badges[badgeIndex];
        if (target.unlockedAt) return false; // Already unlocked

        const updatedBadges = [...state.badges];
        updatedBadges[badgeIndex] = {
          ...target,
          unlockedAt: new Date().toISOString(),
        };

        set({ badges: updatedBadges });
        return true;
      },

      checkMilestoneBadges: (setsCount: number, masteredCount: number) => {
        const state = get();
        const unlockedTitles: string[] = [];
        const nowIso = new Date().toISOString();
        let updated = false;
        const newBadges = state.badges.map((b) => {
          if (b.unlockedAt) return b;
          if (b.id === 'first_set' && setsCount >= 1) {
            unlockedTitles.push(b.title);
            updated = true;
            return { ...b, unlockedAt: nowIso };
          }
          if (b.id === 'master_10' && masteredCount >= 10) {
            unlockedTitles.push(b.title);
            updated = true;
            return { ...b, unlockedAt: nowIso };
          }
          return b;
        });

        if (updated) {
          set({ badges: newBadges });
        }
        return unlockedTitles;
      },

      recordSession: (cardsCount: number, minutesCount: number, quizScore?: number) => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const state = get();
        let newCurrentStreak = state.currentStreak;
        let newLongestStreak = state.longestStreak;
        let streakGrew = false;

        if (!state.lastStudyDate) {
          newCurrentStreak = 1;
          streakGrew = true;
        } else {
          const lastDate = parseISO(state.lastStudyDate);
          const todayDate = parseISO(todayStr);

          if (isSameDay(lastDate, todayDate)) {
            // Already studied today; streak stays same
            newCurrentStreak = state.currentStreak;
          } else if (isSameDay(lastDate, subDays(todayDate, 1))) {
            // Studied yesterday: increment streak
            newCurrentStreak = state.currentStreak + 1;
            streakGrew = true;
          } else {
            // Missed one or more days: start fresh at 1
            newCurrentStreak = 1;
            streakGrew = true;
          }
        }

        if (newCurrentStreak > newLongestStreak) {
          newLongestStreak = newCurrentStreak;
        }

        // Update history
        const existingEntryIndex = state.history.findIndex((h) => h.date === todayStr);
        let updatedHistory: StudyHistoryEntry[];

        if (existingEntryIndex >= 0) {
          const existing = state.history[existingEntryIndex];
          const updatedEntry: StudyHistoryEntry = {
            ...existing,
            cardsStudied: existing.cardsStudied + cardsCount,
            minutesStudied: existing.minutesStudied + minutesCount,
            quizScores:
              quizScore !== undefined
                ? [...existing.quizScores, quizScore]
                : existing.quizScores,
          };
          updatedHistory = [...state.history];
          updatedHistory[existingEntryIndex] = updatedEntry;
        } else {
          const newEntry: StudyHistoryEntry = {
            date: todayStr,
            cardsStudied: cardsCount,
            minutesStudied: minutesCount,
            quizScores: quizScore !== undefined ? [quizScore] : [],
          };
          updatedHistory = [newEntry, ...state.history];
        }

        // Calculate XP earned from this session
        // +10 XP per card reviewed, +25 XP for quiz, +50 XP if streak grew
        let earnedXP = cardsCount * 10;
        if (quizScore !== undefined) {
          earnedXP += 25;
        }
        if (streakGrew) {
          earnedXP += 50;
        }

        const oldLevel = state.level;
        const newTotalXP = state.xp + earnedXP;
        const newLevel = Math.floor(newTotalXP / 100) + 1;
        const leveledUp = newLevel > oldLevel;

        // Total cards studied across history
        const totalCardsStudied = updatedHistory.reduce((acc, h) => acc + h.cardsStudied, 0);
        const currentHour = new Date().getHours();

        // Check badge unlocks
        const nowIso = new Date().toISOString();
        const updatedBadges = state.badges.map((b) => {
          if (b.unlockedAt) return b;
          if (b.id === 'streak_3' && newCurrentStreak >= 3) {
            return { ...b, unlockedAt: nowIso };
          }
          if (b.id === 'streak_7' && newCurrentStreak >= 7) {
            return { ...b, unlockedAt: nowIso };
          }
          if (b.id === 'cards_25' && totalCardsStudied >= 25) {
            return { ...b, unlockedAt: nowIso };
          }
          if (b.id === 'cards_100' && totalCardsStudied >= 100) {
            return { ...b, unlockedAt: nowIso };
          }
          if (b.id === 'perfect_quiz' && quizScore === 100) {
            return { ...b, unlockedAt: nowIso };
          }
          if (b.id === 'night_owl' && currentHour >= 21) {
            return { ...b, unlockedAt: nowIso };
          }
          return b;
        });

        set({
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
          lastStudyDate: todayStr,
          history: updatedHistory,
          streakJustGrew: streakGrew,
          streakProtectedByFreeze: false,
          xp: newTotalXP,
          level: newLevel,
          badges: updatedBadges,
          recentXPGained: earnedXP,
          recentLevelUp: leveledUp,
        });
      },

      resetStats: () => {
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastStudyDate: null,
          history: [],
          streakJustGrew: false,
          streakFreezes: 2,
          freezesUsed: 0,
          streakProtectedByFreeze: false,
          xp: 0,
          level: 1,
          badges: INITIAL_BADGES,
          recentXPGained: 0,
          recentLevelUp: false,
        });
      },
    }),
    {
      name: STATS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,
      migrate: (persistedState: unknown) => {
        const state = (persistedState || {}) as Partial<StatsState>;
        const rawHistory = Array.isArray(state.history) ? state.history : [];
        const cleanHistory = rawHistory.map((h) => ({
          ...h,
          cardsStudied: typeof h.cardsStudied === 'number' ? h.cardsStudied : 0,
          minutesStudied: typeof h.minutesStudied === 'number' ? h.minutesStudied : 0,
          quizScores: Array.isArray(h.quizScores) ? h.quizScores : [],
        }));
        const rawBadges = Array.isArray(state.badges) ? state.badges : INITIAL_BADGES;

        return {
          currentStreak: typeof state.currentStreak === 'number' ? state.currentStreak : 0,
          longestStreak: typeof state.longestStreak === 'number' ? state.longestStreak : 0,
          lastStudyDate: state.lastStudyDate ?? null,
          streakJustGrew: false,
          streakFreezes: typeof state.streakFreezes === 'number' ? state.streakFreezes : 2,
          freezesUsed: typeof state.freezesUsed === 'number' ? state.freezesUsed : 0,
          streakProtectedByFreeze: false,
          xp: typeof state.xp === 'number' ? state.xp : 0,
          level: typeof state.level === 'number' ? state.level : 1,
          recentXPGained: 0,
          recentLevelUp: false,
          ...state,
          history: cleanHistory,
          badges: rawBadges,
        } as StatsState;
      },
    }
  )
);
