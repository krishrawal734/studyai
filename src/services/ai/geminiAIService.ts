import { AIInput, SummarizeOutput, FlashcardsOutput, QuizOutput } from './types';
import {
  summarizeOutputSchema,
  flashcardsOutputSchema,
  quizOutputSchema,
  aiTutorResponseSchema,
  answerGradeResponseSchema,
  weakSpotDiagnosisSchema,
  podcastDialogueSchema,
  mindMapNodeSchema,
  highYieldCardsSchema,
} from './schemas';
import {
  AITutorMode,
  AITutorResponse,
  AnswerGradeResponse,
  WeakSpotDiagnosis,
  PodcastLine,
  MindMapNode,
} from '../../types';

const GEMINI_API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent';

/**
 * Strips markdown code blocks if the model wrapped the JSON in ```json ... ```
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function buildGeminiContents(prompt: string, input?: AIInput) {
  const parts: ({ text?: string; inlineData?: { mimeType: string; data: string } })[] = [];

  if (input?.base64Data) {
    const mime = input.mimeType || (input.sourceType === 'file' ? 'application/pdf' : 'image/jpeg');
    parts.push({
      inlineData: {
        mimeType: mime,
        data: input.base64Data,
      },
    });
  }

  parts.push({ text: prompt });
  return [{ parts }];
}

async function callGeminiRaw(prompt: string, apiKey: string, temperature = 0.2): Promise<string> {
  const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errMsg = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Gemini API Error: ${errMsg}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Empty response from Gemini API');
  return cleanJsonString(rawText);
}

export const geminiAIService = {
  async testConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'Respond with a simple JSON object: {"status": "ok"}' }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errMsg =
          errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, message: errMsg };
      }

      return { success: true, message: 'Connected successfully to Google Gemini AI!' };
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Network error testing Gemini key',
      };
    }
  },

  async summarize(input: AIInput, apiKey: string): Promise<SummarizeOutput> {
    const prompt = `
You are an expert study assistant. Analyze the following study material and generate a high-yield summary.
Subject: ${input.subjectHint}
Study Material:
${input.content}

Return ONLY a JSON object with this exact shape:
{
  "title": "A short, engaging title (max 50 chars)",
  "summary": "A 2-3 paragraph executive summary of the concepts",
  "keyPoints": [
    "High-yield takeaway 1",
    "High-yield takeaway 2",
    "High-yield takeaway 3",
    "High-yield takeaway 4",
    "High-yield takeaway 5"
  ]
}
`;

    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: buildGeminiContents(prompt, input),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini API');

    const parsed = JSON.parse(cleanJsonString(rawText));
    return summarizeOutputSchema.parse(parsed);
  },

  async generateFlashcards(input: AIInput, apiKey: string): Promise<FlashcardsOutput> {
    const prompt = `
You are an expert tutor. Create 6-10 active-recall flashcards from this study material.
Subject: ${input.subjectHint}
Study Material:
${input.content}

Each card must test a clear, specific concept using the active recall technique. Keep answers concise, direct, and memorable.

Return ONLY a JSON object with this exact shape:
{
  "cards": [
    {
      "question": "Clear, direct question",
      "answer": "Concise, accurate answer"
    }
  ]
}
`;

    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: buildGeminiContents(prompt, input),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini API');

    const parsed = JSON.parse(cleanJsonString(rawText));
    return flashcardsOutputSchema.parse(parsed);
  },

  async generateQuiz(input: AIInput, apiKey: string): Promise<QuizOutput> {
    const prompt = `
You are an exam creator. Create 4-6 multiple-choice practice quiz questions from this study material.
Subject: ${input.subjectHint}
Study Material:
${input.content}

Each question must have 4 distinct options, exactly one correct option index (0, 1, 2, or 3), and an educational explanation of why that answer is correct.

Return ONLY a JSON object with this exact shape:
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Clear explanation of why Option A is correct"
    }
  ]
}
`;

    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: buildGeminiContents(prompt, input),
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Empty response from Gemini API');

    const parsed = JSON.parse(cleanJsonString(rawText));
    return quizOutputSchema.parse(parsed);
  },

  async askTutor(
    question: string,
    answer: string,
    mode: AITutorMode,
    customPrompt: string | undefined,
    apiKey: string
  ): Promise<AITutorResponse> {
    let modeInstruction = '';
    if (mode === 'eli5') {
      modeInstruction =
        'Explain this concept using simple language and a clear everyday analogy that a 5-year-old could understand. Avoid dense academic jargon.';
    } else if (mode === 'mnemonic') {
      modeInstruction =
        'Create a memorable acronym, funny mental picture, or rhyme to help a student memorize this exact concept easily.';
    } else if (mode === 'example') {
      modeInstruction =
        'Provide a concrete real-world case study or practical scenario demonstrating how this concept applies in real life or industry.';
    } else {
      modeInstruction = `Answer the student's specific question: "${customPrompt || 'Can you elaborate on this?'}" in context of this flashcard.`;
    }

    const prompt = `
You are a warm, encouraging, expert academic tutor.
Flashcard Question: "${question}"
Flashcard Answer: "${answer}"
Goal: ${modeInstruction}

Return ONLY a JSON object with this shape:
{
  "answer": "Detailed, formatted explanation (use markdown bold/bullets if helpful)",
  "mnemonic": "Short mnemonic phrase or acronym (optional)",
  "keyTakeaway": "One short sentence summarizing the single most important rule"
}
`;

    const raw = await callGeminiRaw(prompt, apiKey, 0.3);
    const parsed = JSON.parse(raw);
    return aiTutorResponseSchema.parse(parsed);
  },

  async gradeAnswer(
    question: string,
    referenceAnswer: string,
    studentAnswer: string,
    apiKey: string
  ): Promise<AnswerGradeResponse> {
    const prompt = `
You are a fair, precise academic evaluator. Grade the student's active recall answer against the reference model answer.
Flashcard Question: "${question}"
Reference Correct Answer: "${referenceAnswer}"
Student's Submitted Answer: "${studentAnswer}"

Evaluate semantic comprehension, not just exact word matching.
Return ONLY a JSON object with this shape:
{
  "score": 85, // integer 0 to 100
  "feedback": "Encouraging, constructive feedback on their answer",
  "nailed": ["Key point 1 they got right", "Key point 2 they got right"],
  "missing": ["Crucial nuance or vocabulary term they missed"],
  "suggestedBox": 3 // 3 if score >= 80, 2 if score between 50 and 79, 1 if score < 50
}
`;

    const raw = await callGeminiRaw(prompt, apiKey, 0.1);
    const parsed = JSON.parse(raw);
    return answerGradeResponseSchema.parse(parsed);
  },

  async generateWeakSpotRemediation(
    strugglingCards: { question: string; answer: string; box: number }[],
    apiKey: string
  ): Promise<WeakSpotDiagnosis> {
    const cardsText = strugglingCards
      .map((c, i) => `${i + 1}. Q: ${c.question} | A: ${c.answer}`)
      .join('\n');

    const prompt = `
You are a cognitive learning diagnostician. A student is struggling with the following Leitner Box 1 flashcards:
${cardsText}

1. Analyze what core conceptual blind spot or confusion is causing these mistakes.
2. Provide a 1-2 sentence diagnostic explanation.
3. Generate 3-5 fresh, targeted remediation flashcards designed to bridge these gaps from complementary angles.
4. Generate 2 practice quiz questions with 4 options and correctIndex (0-3).

Return ONLY a JSON object with this shape:
{
  "diagnosis": "Clear diagnosis of why these concepts are challenging and how to remember them",
  "focusTopic": "Short topic name (e.g. Cellular Respiration Enzymes)",
  "cards": [
    { "question": "Targeted remediation question?", "answer": "Clear, distinct answer" }
  ],
  "quizzes": [
    {
      "question": "Diagnostic quiz question?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "Why A is correct"
    }
  ]
}
`;

    const raw = await callGeminiRaw(prompt, apiKey, 0.3);
    const parsed = JSON.parse(raw);
    return weakSpotDiagnosisSchema.parse(parsed);
  },

  async generatePodcastDialogue(
    set: { title: string; subject: string; summary: string; keyPoints: string[] },
    apiKey: string
  ): Promise<PodcastLine[]> {
    const prompt = `
Create an engaging 6 to 8 turn educational dialogue between two people discussing this study topic:
Title: "${set.title}"
Subject: "${set.subject}"
Summary: "${set.summary}"
Key Takeaways: ${set.keyPoints.join('; ')}

Characters:
- "Host": Knowledgeable, supportive teacher who introduces high-yield exam insights and clears up common traps.
- "Student": Curious, active learner who asks relatable questions, clarifies doubts, and reacts to analogies.

Keep tone natural, energetic, and educational.
Return ONLY a JSON object:
{
  "lines": [
    { "speaker": "Host", "text": "Welcome to today's study session..." },
    { "speaker": "Student", "text": "Thanks! So what is the key thing I need to know about..." }
  ]
}
`;

    const raw = await callGeminiRaw(prompt, apiKey, 0.4);
    const parsed = JSON.parse(raw);
    const validated = podcastDialogueSchema.parse(parsed);
    return validated.lines;
  },

  async generateMindMap(
    set: { title: string; subject: string; summary: string; keyPoints: string[]; cards: { question: string; answer: string }[] },
    apiKey: string
  ): Promise<MindMapNode> {
    const cardsSummary = set.cards
      .slice(0, 10)
      .map((c) => `- ${c.question}: ${c.answer}`)
      .join('\n');

    const prompt = `
Generate a hierarchical concept mind map tree for this study set:
Topic: "${set.title}" (${set.subject})
Summary: "${set.summary}"
Key Concepts: ${set.keyPoints.join('; ')}
Sample Cards:
${cardsSummary}

Create a root node with 3 to 4 core branch nodes, each containing 2 to 3 leaf nodes representing specific mechanisms, terms, or applications.
Return ONLY a JSON object:
{
  "id": "root",
  "label": "${set.title}",
  "summary": "${set.subject} Knowledge Hierarchy",
  "children": [
    {
      "id": "branch_1",
      "label": "Sub-topic 1",
      "summary": "Brief explanation",
      "children": [
        { "id": "leaf_1_1", "label": "Key Term 1", "summary": "Definition or formula" }
      ]
    }
  ]
}
`;

    const raw = await callGeminiRaw(prompt, apiKey, 0.2);
    const parsed = JSON.parse(raw);
    return mindMapNodeSchema.parse(parsed) as MindMapNode;
  },

  async predictHighYieldCards(
    cards: { id: string; question: string; answer: string }[],
    apiKey: string
  ): Promise<string[]> {
    const cardsList = cards.map((c) => ({ id: c.id, q: c.question, a: c.answer }));
    const prompt = `
You are a senior exam designer. Analyze these flashcards and identify the top 35% to 45% highest-yield cards that are most likely to appear on a rigorous test or final exam (focusing on fundamental definitions, core mechanisms, contrast questions, and application scenarios).

Flashcards:
${JSON.stringify(cardsList)}

Return ONLY a JSON object:
{
  "highYieldCardIds": ["card_id_1", "card_id_2"]
}
`;

    const raw = await callGeminiRaw(prompt, apiKey, 0.1);
    const parsed = JSON.parse(raw);
    return highYieldCardsSchema.parse(parsed).highYieldCardIds;
  },
};
