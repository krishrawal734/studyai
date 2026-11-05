import { z } from 'zod';

export const summarizeOutputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().min(1, 'Summary is required'),
  keyPoints: z.array(z.string().min(1)).min(1, 'At least one key point is required'),
});

export const flashcardItemSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
});

export const flashcardsOutputSchema = z.object({
  cards: z.array(flashcardItemSchema).min(1, 'At least one flashcard is required'),
});

export const quizQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  options: z.tuple([z.string(), z.string(), z.string(), z.string()]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1, 'Explanation is required'),
});

export const quizOutputSchema = z.object({
  questions: z.array(quizQuestionSchema).min(1, 'At least one quiz question is required'),
});

export const aiTutorResponseSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
  mnemonic: z.string().optional(),
  keyTakeaway: z.string().optional(),
});

export const answerGradeResponseSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().min(1, 'Feedback is required'),
  nailed: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  suggestedBox: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const weakSpotDiagnosisSchema = z.object({
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  focusTopic: z.string().min(1, 'Focus topic is required'),
  cards: z.array(flashcardItemSchema).min(1, 'At least one remediation card is required'),
  quizzes: z.array(quizQuestionSchema).default([]),
});

export const podcastDialogueSchema = z.object({
  lines: z.array(
    z.object({
      speaker: z.enum(['Host', 'Student']),
      text: z.string().min(1),
    })
  ).min(2, 'At least 2 dialogue lines are required'),
});

export interface MindMapNodeSchemaType {
  id: string;
  label: string;
  summary?: string;
  children?: MindMapNodeSchemaType[];
}

export const mindMapNodeSchema: z.ZodType<MindMapNodeSchemaType> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string().min(1),
    summary: z.string().optional(),
    children: z.array(mindMapNodeSchema).optional(),
  })
);

export const highYieldCardsSchema = z.object({
  highYieldCardIds: z.array(z.string()),
});

export type SummarizeOutputValidated = z.infer<typeof summarizeOutputSchema>;
export type FlashcardsOutputValidated = z.infer<typeof flashcardsOutputSchema>;
export type QuizOutputValidated = z.infer<typeof quizOutputSchema>;
export type AITutorResponseValidated = z.infer<typeof aiTutorResponseSchema>;
export type AnswerGradeResponseValidated = z.infer<typeof answerGradeResponseSchema>;
export type WeakSpotDiagnosisValidated = z.infer<typeof weakSpotDiagnosisSchema>;
export type PodcastDialogueValidated = z.infer<typeof podcastDialogueSchema>;
export type HighYieldCardsValidated = z.infer<typeof highYieldCardsSchema>;
