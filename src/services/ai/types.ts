import {
  AITutorMode,
  AITutorResponse,
  AnswerGradeResponse,
  WeakSpotDiagnosis,
  PodcastLine,
  MindMapNode,
} from '../../types';

export interface AIInput {
  content: string;
  subjectHint?: string;
  sourceType?: 'text' | 'image' | 'file';
  imageUri?: string;
  base64Data?: string;
  mimeType?: string;
}

export interface SummarizeOutput {
  title: string;
  summary: string;
  keyPoints: string[];
}

export interface FlashcardOutputItem {
  question: string;
  answer: string;
}

export interface FlashcardsOutput {
  cards: FlashcardOutputItem[];
}

export interface QuizQuestionOutputItem {
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface QuizOutput {
  questions: QuizQuestionOutputItem[];
}

export interface AIService {
  summarize(input: AIInput): Promise<SummarizeOutput>;
  generateFlashcards(input: AIInput): Promise<FlashcardsOutput>;
  generateQuiz(input: AIInput): Promise<QuizOutput>;
  askTutor(question: string, answer: string, mode: AITutorMode, customPrompt?: string): Promise<AITutorResponse>;
  gradeAnswer(question: string, referenceAnswer: string, studentAnswer: string): Promise<AnswerGradeResponse>;
  generateWeakSpotRemediation(strugglingCards: { question: string; answer: string; box: number }[]): Promise<WeakSpotDiagnosis>;
  generatePodcastDialogue(set: { title: string; subject: string; summary: string; keyPoints: string[] }): Promise<PodcastLine[]>;
  generateMindMap(set: { title: string; subject: string; summary: string; keyPoints: string[]; cards: { question: string; answer: string }[] }): Promise<MindMapNode>;
  predictHighYieldCards(cards: { id: string; question: string; answer: string }[]): Promise<string[]>;
}
