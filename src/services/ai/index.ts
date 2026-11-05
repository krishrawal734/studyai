import { AIService, AIInput, SummarizeOutput, FlashcardsOutput, QuizOutput } from './types';
import { mockAIService } from './mockAIService';
import { geminiAIService } from './geminiAIService';
import { useSettingsStore, MASTER_GEMINI_KEY } from '../../store/useSettingsStore';

/**
 * Global helper to resolve the active AI configuration.
 * Every user gets live Google Gemini AI by default using the built-in Master API key.
 * If a student enters their own custom key in Settings, that key takes priority.
 */
function getActiveAIConfig(): { useRealAI: boolean; apiKey: string } {
  const { geminiApiKey } = useSettingsStore.getState();
  const key =
    geminiApiKey && geminiApiKey.trim().length > 0
      ? geminiApiKey.trim()
      : MASTER_GEMINI_KEY;

  if (!key || key.trim().length === 0) {
    return { useRealAI: false, apiKey: '' };
  }

  // Always keep Google Gemini AI active in the background for all users
  return { useRealAI: true, apiKey: key };
}

/**
 * Hybrid AIService:
 * Uses Google Gemini AI by default for every user (with the master cloud key),
 * or with their custom key if provided in Settings.
 * Automatically falls back to the instant zero-latency offline engine when offline.
 */
export const aiService: AIService = {
  async summarize(input: AIInput): Promise<SummarizeOutput> {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.summarize(input, apiKey);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to mock AI:', err);
        return await mockAIService.summarize(input);
      }
    }
    return await mockAIService.summarize(input);
  },

  async generateFlashcards(input: AIInput): Promise<FlashcardsOutput> {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.generateFlashcards(input, apiKey);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to mock AI:', err);
        return await mockAIService.generateFlashcards(input);
      }
    }
    return await mockAIService.generateFlashcards(input);
  },

  async generateQuiz(input: AIInput): Promise<QuizOutput> {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.generateQuiz(input, apiKey);
      } catch (err) {
        console.warn('Gemini API call failed, falling back to mock AI:', err);
        return await mockAIService.generateQuiz(input);
      }
    }
    return await mockAIService.generateQuiz(input);
  },

  async askTutor(question, answer, mode, customPrompt) {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.askTutor(question, answer, mode, customPrompt, apiKey);
      } catch (err) {
        console.warn('Gemini askTutor failed, falling back to mock AI:', err);
        return await mockAIService.askTutor(question, answer, mode, customPrompt);
      }
    }
    return await mockAIService.askTutor(question, answer, mode, customPrompt);
  },

  async gradeAnswer(question, referenceAnswer, studentAnswer) {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.gradeAnswer(question, referenceAnswer, studentAnswer, apiKey);
      } catch (err) {
        console.warn('Gemini gradeAnswer failed, falling back to mock AI:', err);
        return await mockAIService.gradeAnswer(question, referenceAnswer, studentAnswer);
      }
    }
    return await mockAIService.gradeAnswer(question, referenceAnswer, studentAnswer);
  },

  async generateWeakSpotRemediation(strugglingCards) {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.generateWeakSpotRemediation(strugglingCards, apiKey);
      } catch (err) {
        console.warn('Gemini generateWeakSpotRemediation failed, falling back to mock AI:', err);
        return await mockAIService.generateWeakSpotRemediation(strugglingCards);
      }
    }
    return await mockAIService.generateWeakSpotRemediation(strugglingCards);
  },

  async generatePodcastDialogue(set) {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.generatePodcastDialogue(set, apiKey);
      } catch (err) {
        console.warn('Gemini generatePodcastDialogue failed, falling back to mock AI:', err);
        return await mockAIService.generatePodcastDialogue(set);
      }
    }
    return await mockAIService.generatePodcastDialogue(set);
  },

  async generateMindMap(set) {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.generateMindMap(set, apiKey);
      } catch (err) {
        console.warn('Gemini generateMindMap failed, falling back to mock AI:', err);
        return await mockAIService.generateMindMap(set);
      }
    }
    return await mockAIService.generateMindMap(set);
  },

  async predictHighYieldCards(cards) {
    const { useRealAI, apiKey } = getActiveAIConfig();
    if (useRealAI) {
      try {
        return await geminiAIService.predictHighYieldCards(cards, apiKey);
      } catch (err) {
        console.warn('Gemini predictHighYieldCards failed, falling back to mock AI:', err);
        return await mockAIService.predictHighYieldCards(cards);
      }
    }
    return await mockAIService.predictHighYieldCards(cards);
  },
};

export * from './types';
export * from './schemas';
export * from './mockAIService';
export * from './realAIService';
export * from './geminiAIService';
