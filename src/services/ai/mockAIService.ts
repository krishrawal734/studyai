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
  aiTutorResponseSchema,
  answerGradeResponseSchema,
  weakSpotDiagnosisSchema,
  podcastDialogueSchema,
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

// Common English stop words to filter out when extracting keywords
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'this', 'these', 'those', 'they', 'their', 'we', 'you', 'or',
  'but', 'not', 'have', 'had', 'been', 'which', 'who', 'whom', 'where', 'when',
  'how', 'can', 'could', 'should', 'would', 'also', 'more', 'into', 'than',
]);

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

  // Count word frequencies
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Sort by frequency
  return Object.keys(freq)
    .sort((a, b) => freq[b] - freq[a])
    .slice(0, 10)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
}

function extractSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim().replace(/^[-*•\d.)\s]+/, ''))
    .filter((s) => s.length >= 20);
}

function randomDelay(minMs: number = 600, maxMs: number = 1100): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkSimulatedError(input: AIInput) {
  // Only trigger if developer explicitly passes special flag
  if (input.content.toLowerCase().includes('__simulate_error_test__')) {
    throw new Error('Simulated AI connection timeout. Please check your network and try again.');
  }
}

export const mockAIService: AIService = {
  async summarize(input: AIInput): Promise<SummarizeOutput> {
    await randomDelay(600, 1000);
    checkSimulatedError(input);

    const sentences = extractSentences(input.content);
    const keywords = extractKeywords(input.content);
    const subject = input.subjectHint ?? 'General Study';

    // Synthesize Title
    let title = '';
    if (input.sourceType === 'image') {
      title = `${subject}: Visual Diagram & Notes`;
    } else {
      const firstLine = input.content.split('\n')[0].trim().replace(/^#+\s*/, '');
      if (firstLine.length > 5 && firstLine.length <= 60) {
        title = firstLine;
      } else if (keywords.length >= 2) {
        title = `${keywords[0]} & ${keywords[1]}: Core Concepts`;
      } else if (keywords.length === 1) {
        title = `Fundamentals of ${keywords[0]}`;
      } else {
        title = `${subject} Study Notes`;
      }
    }

    // Synthesize Summary
    let summary = '';
    if (input.sourceType === 'image') {
      summary = `Visual study notes on ${subject}. This overview captures key diagram labels, core formulas, and structural relationships identified from the photo note preview.`;
    } else if (sentences.length >= 2) {
      summary = sentences.slice(0, 3).join(' ');
    } else if (sentences.length === 1) {
      summary = `${sentences[0]} This study unit focuses on key principles of ${keywords[0] ?? subject}, highlighting foundational concepts and core mechanisms.`;
    } else {
      summary = `An overview of ${subject} exploring key terminology including ${
        keywords.slice(0, 4).join(', ') || 'essential topics'
      }. Designed for active recall and retention.`;
    }

    // Synthesize Key Points
    const keyPoints: string[] = [];
    if (input.sourceType === 'image') {
      keyPoints.push(`Primary structural diagram illustrating foundational ${subject} components.`);
      keyPoints.push('Core annotations, labels, and schematic relationships.');
      keyPoints.push('Step-by-step mechanism and functional flow.');
      keyPoints.push('High-yield recall points commonly tested in exam assessments.');
    } else if (sentences.length >= 3) {
      sentences.slice(0, 4).forEach((s) => {
        keyPoints.push(s.endsWith('.') ? s : s + '.');
      });
    } else {
      if (keywords.length >= 3) {
        keyPoints.push(`Primary focus is directed towards the study and application of ${keywords[0]}.`);
        keyPoints.push(`The mechanism of ${keywords[1]} plays a vital role in practical execution.`);
        keyPoints.push(`Understanding ${keywords[2]} is critical for comprehensive mastery.`);
      } else {
        keyPoints.push(`Key definitions and foundational terms regarding ${subject}.`);
        keyPoints.push('Core theoretical framework and structural principles.');
        keyPoints.push('Practical applications and exam preparation focal points.');
      }
    }

    const result: SummarizeOutput = {
      title,
      summary,
      keyPoints: keyPoints.slice(0, 5),
    };

    // Zod validation
    return summarizeOutputSchema.parse(result);
  },

  async generateFlashcards(input: AIInput): Promise<FlashcardsOutput> {
    await randomDelay(600, 1000);
    checkSimulatedError(input);

    const sentences = extractSentences(input.content);
    const keywords = extractKeywords(input.content);
    const subject = input.subjectHint ?? 'General';

    const cards: { question: string; answer: string }[] = [];

    // Build question/answer pairs from extracted sentences
    sentences.slice(0, 4).forEach((sentence) => {
      const words = sentence.split(' ');
      if (words.length > 6) {
        const pivot = Math.floor(words.length / 2);
        const questionPart = words.slice(0, pivot).join(' ');
        const answerPart = words.slice(pivot).join(' ');
        cards.push({
          question: `Regarding ${questionPart}... what is the conclusion?`,
          answer: answerPart.endsWith('.') ? answerPart : answerPart + '.',
        });
      }
    });

    // Build question/answer pairs from keywords
    keywords.slice(0, 4).forEach((keyword, index) => {
      const match = sentences.find((s) => s.toLowerCase().includes(keyword.toLowerCase()));
      cards.push({
        question: `Define and state the key significance of "${keyword}":`,
        answer: match
          ? match
          : `A pivotal concept in ${subject} responsible for core operations and relationships (Key #${index + 1}).`,
      });
    });

    // Ensure we have at least 3 cards
    if (input.sourceType === 'image') {
      cards.push({
        question: `What is the central structure depicted in this ${subject} visual diagram?`,
        answer: `The primary mechanism coordinating functional stages and relationships in ${subject}.`,
      });
      cards.push({
        question: `How are the annotated components in the photo note connected?`,
        answer: 'Through directional sequential steps leading from initial inputs to final outputs.',
      });
      cards.push({
        question: `What exam question is most likely based on this visual note?`,
        answer: `Labeling key anatomical/logical stages and explaining rate-limiting steps in ${subject}.`,
      });
    } else if (cards.length < 3) {
      cards.push({
        question: `What is the primary objective of this ${subject} study unit?`,
        answer: input.content.slice(0, 150) || 'Comprehensive topic understanding and mastery.',
      });
      cards.push({
        question: `Why is consistent active recall important for ${subject}?`,
        answer: 'Active recall strengthens neural pathways and prevents the forgetting curve through spaced intervals.',
      });
      cards.push({
        question: `What are the core pillars discussed in these notes?`,
        answer: keywords.slice(0, 5).join(', ') || 'Foundational principles and key definitions.',
      });
    }

    const result: FlashcardsOutput = {
      cards: cards.slice(0, 6),
    };

    // Zod validation
    return flashcardsOutputSchema.parse(result);
  },

  async generateQuiz(input: AIInput): Promise<QuizOutput> {
    await randomDelay(600, 1000);
    checkSimulatedError(input);

    const sentences = extractSentences(input.content);
    const keywords = extractKeywords(input.content);
    const subject = input.subjectHint ?? 'General';

    const questions: QuizOutput['questions'] = [];

    // Question 1 based on primary keyword
    const kw1 = keywords[0] ?? 'the primary subject';
    const kw2 = keywords[1] ?? 'secondary process';
    const kw3 = keywords[2] ?? 'alternative mechanism';
    const kw4 = keywords[3] ?? 'control factor';

    questions.push({
      question: `Which of the following is the most accurate definition of ${kw1}?`,
      options: [
        `A foundational concept in ${subject} governing system behavior.`,
        `An external anomaly that is unrelated to ${subject}.`,
        `A temporary byproduct that has no functional role.`,
        `A historical misconception that was subsequently disproven.`,
      ],
      correctIndex: 0,
      explanation: `${kw1} is central to ${subject} and describes the primary operational principle outlined in your notes.`,
    });

    // Question 2 based on sentence or relationship
    if (sentences.length > 0) {
      const targetSentence = sentences[0];
      questions.push({
        question: `Based on your notes, which statement directly aligns with the material?`,
        options: [
          'The principles described occur randomly with no predictable patterns.',
          targetSentence.endsWith('.') ? targetSentence : targetSentence + '.',
          `The study material solely applies to topics outside of ${subject}.`,
          'All experimental results in this field have been invalidated.',
        ],
        correctIndex: 1,
        explanation: `This statement is directly derived from the study notes provided.`,
      });
    } else {
      questions.push({
        question: `What is the primary function associated with ${kw2}?`,
        options: [
          'Inhibiting all active processes permanently.',
          'Serving as an inactive placeholder.',
          `Facilitating the core interactions within ${subject}.`,
          'Measuring external unrelated noise.',
        ],
        correctIndex: 2,
        explanation: `${kw2} facilitates key interactions and functional outcomes within the subject.`,
      });
    }

    // Question 3: Concept distinction
    questions.push({
      question: `How does ${kw1} primarily differ from ${kw3}?`,
      options: [
        'They are identical terms with no distinction whatsoever.',
        'Neither is relevant to the topics covered.',
        'Both operate exclusively in inverted conditions.',
        `${kw1} drives the central framework, whereas ${kw3} addresses specialized or auxiliary conditions.`,
      ],
      correctIndex: 3,
      explanation: `${kw1} provides the primary governing structure, while ${kw3} functions as an auxiliary or specialized component.`,
    });

    // Question 4: Application
    questions.push({
      question: `In an applied examination scenario, what is the best strategy to demonstrate understanding of ${kw4}?`,
      options: [
        `Explain its contextual relationship with ${kw1} and practical outcomes.`,
        'Memorize only the single word with no supporting details.',
        'Ignore it completely since it is rarely evaluated.',
        'Assume it only applies in theoretical simulations.',
      ],
      correctIndex: 0,
      explanation: `Connecting ${kw4} to the core concept ${kw1} demonstrates deep contextual mastery.`,
    });

    const result: QuizOutput = {
      questions,
    };

    // Zod validation
    return quizOutputSchema.parse(result);
  },

  async askTutor(
    question: string,
    answer: string,
    mode: AITutorMode,
    customPrompt?: string
  ): Promise<AITutorResponse> {
    await randomDelay(400, 800);
    const keywords = extractKeywords(answer);
    const kw = keywords[0] || 'core concept';

    if (mode === 'eli5') {
      return aiTutorResponseSchema.parse({
        answer: `Think of "${kw}" like a busy kitchen in a restaurant. When an order comes in, the head chef coordinates everyone so no food burns. In this question, ${answer.toLowerCase().startsWith('the') ? answer : 'the principle is ' + answer}—it keeps everything running smoothly without breaking down!`,
        keyTakeaway: `Bottom Line: ${kw} is the mechanism that ensures balance and stability.`,
      });
    }

    if (mode === 'mnemonic') {
      const letters = keywords.slice(0, 4).map((k) => k.charAt(0).toUpperCase());
      const acronym = letters.join('') || 'FAST';
      return aiTutorResponseSchema.parse({
        answer: `Here is a memory hook for "${question}":\n\nRemember the acronym **${acronym}**:\n${keywords.slice(0, 4).map((k) => `• **${k.charAt(0).toUpperCase()}** = ${k}`).join('\n')}\n\nVisual Trick: Picture a brightly lit sign blinking "${acronym}" over a giant model of ${kw}.`,
        mnemonic: acronym,
        keyTakeaway: `Whenever this question appears, immediately write "${acronym}" in the margins!`,
      });
    }

    if (mode === 'example') {
      return aiTutorResponseSchema.parse({
        answer: `Real-World Application:\nIn real industry or clinical practice, experts rely on ${kw} daily. For instance, when designing high-reliability systems or evaluating critical diagnostics, ignoring ${answer.toLowerCase()} leads to failure or unpredictable behavior. Knowing this distinction is what separates novices from top scorers.`,
        keyTakeaway: `Real-world relevance: ${kw} is used to prevent systemic breakdowns.`,
      });
    }

    // mode === 'custom'
    const promptText = customPrompt?.trim() || 'How does this work?';
    return aiTutorResponseSchema.parse({
      answer: `Great question regarding "${promptText}"!\n\nTo break this down in context of "${question}": the primary reason the answer is "${answer}" centers on ${kw}. While it might initially seem counter-intuitive, ${kw} governs how the components interact under standard conditions.\n\nKey exam tip: Examiners love testing whether you understand the cause-and-effect relationship rather than just memorizing the term.`,
      keyTakeaway: `Focus on how ${kw} connects to the overall mechanism.`,
    });
  },

  async gradeAnswer(
    question: string,
    referenceAnswer: string,
    studentAnswer: string
  ): Promise<AnswerGradeResponse> {
    await randomDelay(500, 900);
    const trimmedStudent = studentAnswer.trim().toLowerCase();
    if (trimmedStudent.length < 3) {
      return answerGradeResponseSchema.parse({
        score: 0,
        feedback: 'No answer provided. Give it your best shot in your own words before flipping the card!',
        nailed: [],
        missing: extractKeywords(referenceAnswer).slice(0, 3),
        suggestedBox: 1,
      });
    }

    const refKeywords = extractKeywords(referenceAnswer);
    const nailed: string[] = [];
    const missing: string[] = [];

    refKeywords.forEach((kw) => {
      if (trimmedStudent.includes(kw.toLowerCase())) {
        nailed.push(kw);
      } else {
        missing.push(kw);
      }
    });

    // Score based on keyword match ratio and length
    const matchRatio = refKeywords.length > 0 ? nailed.length / refKeywords.length : 0.5;
    const lengthFactor = Math.min(1, trimmedStudent.length / Math.max(10, referenceAnswer.length * 0.5));
    const rawScore = Math.round((matchRatio * 0.75 + lengthFactor * 0.25) * 100);
    const score = Math.max(15, Math.min(100, rawScore));

    let feedback = '';
    let suggestedBox: 1 | 2 | 3 = 1;

    if (score >= 80) {
      feedback = 'Outstanding recall! You accurately captured the core mechanism and key vocabulary.';
      suggestedBox = 3;
    } else if (score >= 50) {
      feedback = 'Good grasp of the concept! You hit the main idea, but missed a few precise technical details.';
      suggestedBox = 2;
    } else {
      feedback = 'You are on the right track, but missed the essential keywords. Keep this card in Box 1 for tomorrow.';
      suggestedBox = 1;
    }

    return answerGradeResponseSchema.parse({
      score,
      feedback,
      nailed,
      missing,
      suggestedBox,
    });
  },

  async generateWeakSpotRemediation(
    strugglingCards: { question: string; answer: string; box: number }[]
  ): Promise<WeakSpotDiagnosis> {
    await randomDelay(800, 1300);
    const allKeywords = extractKeywords(strugglingCards.map((c) => `${c.question} ${c.answer}`).join(' '));
    const focusTopic = allKeywords[0] || 'Core Concepts';

    const cards = strugglingCards.slice(0, 5).map((c, i) => ({
      question: `[Weak-Spot Drill ${i + 1}] In terms of ${focusTopic}, what is the precise role of ${extractKeywords(c.question)[0] || 'this element'}?`,
      answer: `Key distinction: ${c.answer} (Review closely to distinguish from related distractors).`,
    }));

    if (cards.length === 0) {
      cards.push({
        question: `What is the foundational principle behind ${focusTopic}?`,
        answer: `${focusTopic} serves as the primary governing mechanism for this topic.`,
      });
    }

    const quizzes = [
      {
        id: 'remed_q1',
        question: `When differentiating between the core components of ${focusTopic}, which factor is most frequently tested?`,
        options: [
          `The direct causal mechanism that drives the outcome.`,
          'Arbitrary numbering systems without functional purpose.',
          'Historical anecdotes with no scientific basis.',
          'Hypothetical exceptions that never occur in practice.',
        ] as [string, string, string, string],
        correctIndex: 0,
        explanation: `Examiners focus on the direct causal mechanism connecting ${focusTopic} to functional results.`,
      },
    ];

    return weakSpotDiagnosisSchema.parse({
      diagnosis: `Analysis indicates consistent difficulty with ${focusTopic} and related distinctions. This targeted drill bridges the gap by testing the principles from complementary angles.`,
      focusTopic,
      cards,
      quizzes,
    });
  },

  async generatePodcastDialogue(
    set: { title: string; subject: string; summary: string; keyPoints: string[] }
  ): Promise<PodcastLine[]> {
    await randomDelay(700, 1200);
    const kp1 = set.keyPoints[0] || 'the core mechanisms';
    const kp2 = set.keyPoints[1] || 'critical exam distinctions';
    const kp3 = set.keyPoints[2] || 'practical applications';

    const lines: PodcastLine[] = [
      {
        speaker: 'Host',
        text: `Welcome back to StudyAI Podcast! Today, we're breaking down ${set.title} in ${set.subject}. If you have an exam coming up, this is pure high-yield territory.`,
      },
      {
        speaker: 'Student',
        text: `I've been reviewing this chapter, but I always get tripped up on the fundamentals. Where should a student start?`,
      },
      {
        speaker: 'Host',
        text: `Start with the big picture: ${set.summary.slice(0, 160)}... Once that clicks, everything else falls into place.`,
      },
      {
        speaker: 'Student',
        text: `That makes so much more sense. But what's the number one mistake students make on test day?`,
      },
      {
        speaker: 'Host',
        text: `The biggest trap is overlooking this rule: ${kp1}. Professors love testing whether you understand the 'why' rather than just the definition.`,
      },
      {
        speaker: 'Student',
        text: `Right! And how does that relate to ${kp2}?`,
      },
      {
        speaker: 'Host',
        text: `Exactly. ${kp2} acts as the catalyst. When you put them together with ${kp3}, you have a complete mental model.`,
      },
      {
        speaker: 'Student',
        text: `Awesome summary. I feel way more confident tackling these cards now!`,
      },
      {
        speaker: 'Host',
        text: `Keep that active recall going, review your Leitner boxes, and you're going to ace this test. See you in the next study session!`,
      },
    ];

    const result = podcastDialogueSchema.parse({ lines });
    return result.lines;
  },

  async generateMindMap(
    set: { title: string; subject: string; summary: string; keyPoints: string[]; cards: { question: string; answer: string }[] }
  ): Promise<MindMapNode> {
    await randomDelay(600, 1100);
    const branches = set.keyPoints.slice(0, 4).map((kp, idx) => {
      const cardSubset = set.cards.slice(idx * 2, idx * 2 + 2);
      const children = cardSubset.map((c, cIdx) => ({
        id: `node_leaf_${idx}_${cIdx}`,
        label: c.question.length > 40 ? c.question.slice(0, 37) + '...' : c.question,
        summary: c.answer,
      }));

      return {
        id: `node_branch_${idx}`,
        label: kp.length > 35 ? kp.slice(0, 32) + '...' : kp,
        summary: kp,
        children: children.length > 0 ? children : undefined,
      };
    });

    const root: MindMapNode = {
      id: 'root',
      label: set.title,
      summary: `${set.subject} · Core Knowledge Hierarchy`,
      children: branches,
    };

    return root;
  },

  async predictHighYieldCards(
    cards: { id: string; question: string; answer: string }[]
  ): Promise<string[]> {
    await randomDelay(300, 600);
    // Score cards based on academic question keywords and answer detail
    const scored = cards.map((c) => {
      let score = 0;
      const q = c.question.toLowerCase();
      if (q.includes('what') || q.includes('define') || q.includes('how') || q.includes('why')) score += 3;
      if (q.includes('difference') || q.includes('compare') || q.includes('mechanism')) score += 4;
      if (c.answer.length > 40) score += 2;
      return { id: c.id, score };
    });

    // Pick top ~40% highest scoring cards (minimum 1)
    scored.sort((a, b) => b.score - a.score);
    const count = Math.max(1, Math.ceil(cards.length * 0.4));
    const highYieldCardIds = scored.slice(0, count).map((s) => s.id);

    return highYieldCardsSchema.parse({ highYieldCardIds }).highYieldCardIds;
  },
};
