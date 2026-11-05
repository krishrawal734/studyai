import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StudySet, Card, LeitnerBox, PodcastLine, MindMapNode } from '../types';
import { calculateNextReviewDate } from '../utils';

interface SetState {
  sets: StudySet[];
  addSet: (set: Omit<StudySet, 'id' | 'createdAt'>) => StudySet;
  updateSet: (id: string, updates: Partial<Omit<StudySet, 'id' | 'createdAt'>>) => void;
  deleteSet: (id: string) => void;
  updateCardBox: (setId: string, cardId: string, box: LeitnerBox, nextReview: string) => void;
  toggleCardStarred: (setId: string, cardId: string) => void;
  addCardToSet: (setId: string, question: string, answer: string) => Card;
  updateCard: (setId: string, cardId: string, question: string, answer: string) => void;
  deleteCard: (setId: string, cardId: string) => void;
  recordQuizAttempt: (setId: string, quizId: string, score: number) => void;
  setExamDate: (setId: string, examDate: string | null) => void;
  savePodcastScript: (setId: string, script: PodcastLine[]) => void;
  saveMindMap: (setId: string, mindMap: MindMapNode) => void;
  setCardsHighYield: (setId: string, cardIds: string[]) => void;
  getSet: (id: string) => StudySet | undefined;
  resetSets: () => void;
}

const SETS_STORAGE_KEY = 'studyai_sets_v1';
const STORE_VERSION = 1;

export const useSetStore = create<SetState>()(
  persist(
    (set, get) => ({
      sets: [],

      addSet: (newSetData) => {
        const id = 'set_' + Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7);
        const newSet: StudySet = {
          ...newSetData,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          sets: [newSet, ...state.sets],
        }));
        return newSet;
      },

      updateSet: (id, updates) => {
        set((state) => ({
          sets: state.sets.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      },

      deleteSet: (id) => {
        set((state) => ({
          sets: state.sets.filter((item) => item.id !== id),
        }));
      },

      updateCardBox: (setId, cardId, box, nextReview) => {
        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              cards: item.cards.map((card) =>
                card.id === cardId
                  ? { ...card, box, nextReview, lastReviewed: new Date().toISOString() }
                  : card
              ),
            };
          }),
        }));
      },

      toggleCardStarred: (setId, cardId) => {
        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              cards: item.cards.map((card) =>
                card.id === cardId
                  ? { ...card, starred: !card.starred }
                  : card
              ),
            };
          }),
        }));
      },

      addCardToSet: (setId, question, answer) => {
        const newCard: Card = {
          id: 'card_' + Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
          question: question.trim(),
          answer: answer.trim(),
          box: 1,
          nextReview: calculateNextReviewDate(1),
          starred: false,
        };

        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              cards: [...item.cards, newCard],
            };
          }),
        }));

        return newCard;
      },

      updateCard: (setId, cardId, question, answer) => {
        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              cards: item.cards.map((card) =>
                card.id === cardId
                  ? { ...card, question: question.trim(), answer: answer.trim() }
                  : card
              ),
            };
          }),
        }));
      },

      deleteCard: (setId, cardId) => {
        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              cards: item.cards.filter((card) => card.id !== cardId),
            };
          }),
        }));
      },

      recordQuizAttempt: (setId, quizId, score) => {
        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              quizzes: item.quizzes.map((quiz) =>
                quiz.id === quizId
                  ? {
                      ...quiz,
                      attempts: quiz.attempts + 1,
                      lastScore: score,
                      lastAttemptAt: new Date().toISOString(),
                    }
                  : quiz
              ),
            };
          }),
        }));
      },

      setExamDate: (setId, examDate) => {
        set((state) => ({
          sets: state.sets.map((item) =>
            item.id === setId ? { ...item, examDate } : item
          ),
        }));
      },

      savePodcastScript: (setId, script) => {
        set((state) => ({
          sets: state.sets.map((item) =>
            item.id === setId ? { ...item, podcastScript: script } : item
          ),
        }));
      },

      saveMindMap: (setId, mindMap) => {
        set((state) => ({
          sets: state.sets.map((item) =>
            item.id === setId ? { ...item, mindMap } : item
          ),
        }));
      },

      setCardsHighYield: (setId, cardIds) => {
        const idSet = new Set(cardIds);
        set((state) => ({
          sets: state.sets.map((item) => {
            if (item.id !== setId) return item;
            return {
              ...item,
              cards: item.cards.map((c) => ({
                ...c,
                highYield: idSet.has(c.id),
              })),
            };
          }),
        }));
      },

      getSet: (id) => {
        return get().sets.find((s) => s.id === id);
      },

      resetSets: () => {
        set({ sets: [] });
      },
    }),
    {
      name: SETS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,
      migrate: (persistedState: unknown) => {
        const state = (persistedState || {}) as Partial<SetState>;
        const rawSets = Array.isArray(state.sets) ? state.sets : [];
        const cleanSets = rawSets.map((s) => ({
          ...s,
          cards: Array.isArray(s.cards) ? s.cards : [],
          quizzes: Array.isArray(s.quizzes) ? s.quizzes : [],
          keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints : [],
        }));
        return {
          ...state,
          sets: cleanSets,
        } as SetState;
      },
    }
  )
);
