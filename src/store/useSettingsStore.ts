import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, AppTheme } from '../types';

interface SettingsState extends Settings {
  setTheme: (theme: AppTheme) => void;
  setReminder: (time: string | null, enabled: boolean) => void;
  setOnboardingDone: (done: boolean) => void;
  setGeminiApiKey: (key: string | null) => void;
  setUseRealAI: (enabled: boolean) => void;
  resetSettings: () => void;
}

const SETTINGS_STORAGE_KEY = 'studyai_settings_v1';
const STORE_VERSION = 3;

export const DEFAULT_GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
export const MASTER_GEMINI_KEY = DEFAULT_GEMINI_KEY;

const initialSettings: Settings = {
  theme: 'system',
  reminderTime: '20:00',
  reminderEnabled: false,
  onboardingDone: false,
  geminiApiKey: DEFAULT_GEMINI_KEY || null,
  useRealAI: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialSettings,

      setTheme: (theme) => set({ theme }),

      setReminder: (reminderTime, reminderEnabled) =>
        set({ reminderTime, reminderEnabled }),

      setOnboardingDone: (onboardingDone) => set({ onboardingDone }),

      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),

      setUseRealAI: (useRealAI) => set({ useRealAI }),

      resetSettings: () => set({ ...initialSettings }),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,
      migrate: (persistedState: unknown) => {
        const state = (persistedState || {}) as Partial<SettingsState>;
        return {
          ...initialSettings,
          ...state,
          geminiApiKey: state.geminiApiKey || DEFAULT_GEMINI_KEY,
          useRealAI: true,
        };
      },
    }
  )
);
