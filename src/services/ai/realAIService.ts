import {
  AIService,
  AIInput,
  SummarizeOutput,
  FlashcardsOutput,
  QuizOutput,
} from './types';
import {
  summarizeOutputSchema,
  flashcardsOutputSchema,
  quizOutputSchema,
} from './schemas';

/**
 * Real AI Service Implementation (Production Template)
 *
 * ARCHITECTURAL SECURITY NOTE:
 * Never store third-party AI keys (OpenAI, Anthropic, Gemini, etc.) directly in the mobile client.
 * In production, this service sends requests to your dedicated backend API gateway (e.g. https://api.yourdomain.com/v1/study).
 * The backend authenticates the student session via user token, manages AI rate limits,
 * and communicates securely with LLM providers using server-side environment secrets.
 */

// Production API base URL (configurable via environment variable)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.studyai.app/v1';

export const realAIService: AIService = {  
  async summarize(input: AIInput): Promise<SummarizeOutput> {
    // TODO: Connect to your backend endpoint: POST /v1/ai/summarize
    // Request Payload:
    // {
    //   content: input.content,
    //   subjectHint: input.subjectHint,
    //   sourceType: input.sourceType,
    //   imageUri: input.imageUri
    // }
    //
    // Headers:
    // {
    //   'Content-Type': 'application/json',
    //   'Authorization': 'Bearer <user-auth-token-from-secure-store>'
    // }

    const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: input.content,
        subjectHint: input.subjectHint,
        sourceType: input.sourceType,
        imageUri: input.imageUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }

    const data = await response.json();

    // Validate response with Zod before trusting it in the UI
    return summarizeOutputSchema.parse(data);
  },

  async generateFlashcards(input: AIInput): Promise<FlashcardsOutput> {
    // TODO: Connect to backend endpoint: POST /v1/ai/flashcards
    const response = await fetch(`${API_BASE_URL}/ai/flashcards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: input.content,
        subjectHint: input.subjectHint,
        sourceType: input.sourceType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }

    const data = await response.json();
    return flashcardsOutputSchema.parse(data);
  },

  async generateQuiz(input: AIInput): Promise<QuizOutput> {
    // TODO: Connect to backend endpoint: POST /v1/ai/quiz
    const response = await fetch(`${API_BASE_URL}/ai/quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: input.content,
        subjectHint: input.subjectHint,
        sourceType: input.sourceType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }

    const data = await response.json();
    return quizOutputSchema.parse(data);
  },

  async askTutor(question, answer, mode, customPrompt) {
    const response = await fetch(`${API_BASE_URL}/ai/tutor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, answer, mode, customPrompt }),
    });
    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }
    return await response.json();
  },

  async gradeAnswer(question, referenceAnswer, studentAnswer) {
    const response = await fetch(`${API_BASE_URL}/ai/grade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, referenceAnswer, studentAnswer }),
    });
    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }
    return await response.json();
  },

  async generateWeakSpotRemediation(strugglingCards) {
    const response = await fetch(`${API_BASE_URL}/ai/weak-spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strugglingCards }),
    });
    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }
    return await response.json();
  },

  async generatePodcastDialogue(set) {
    const response = await fetch(`${API_BASE_URL}/ai/podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set }),
    });
    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }
    const data = await response.json();
    return data.lines;
  },

  async generateMindMap(set) {
    const response = await fetch(`${API_BASE_URL}/ai/mind-map`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ set }),
    });
    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }
    return await response.json();
  },

  async predictHighYieldCards(cards) {
    const response = await fetch(`${API_BASE_URL}/ai/high-yield`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards }),
    });
    if (!response.ok) {
      throw new Error(`Real AI backend returned error status: ${response.status}`);
    }
    const data = await response.json();
    return data.highYieldCardIds;
  },
};
