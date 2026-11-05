import { useState, useCallback, useMemo } from 'react';
import { Quiz, QuizQuestion } from '../types';
import { useSetStore, useStatsStore } from '../store';
import { safeHaptics } from '../utils';

export interface UserAnswerRecord {
  questionId: string;
  question: string;
  options: [string, string, string, string];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  explanation: string;
}

export interface UseQuizSessionProps {
  setId: string;
  quiz?: Quiz;
}

export function useQuizSession({ setId, quiz }: UseQuizSessionProps) {
  const recordQuizAttempt = useSetStore((state) => state.recordQuizAttempt);
  const recordSession = useStatsStore((state) => state.recordSession);

  const initialQuestions = useMemo(() => quiz?.questions ?? [], [quiz]);

  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(initialQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Effective questions source
  const questionsSource = activeQuestions.length > 0 ? activeQuestions : initialQuestions;

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswerRecord[]>([]);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [isRetryWrongMode, setIsRetryWrongMode] = useState(false);

  const totalQuestions = questionsSource.length;
  const currentQ = questionsSource[currentQuestionIndex] as QuizQuestion | undefined;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  // List of questions that were answered incorrectly in this run
  const wrongQuestions = useMemo(() => {
    const wrongIds = new Set(
      userAnswers.filter((a) => !a.isCorrect).map((a) => a.questionId)
    );
    return initialQuestions.filter((q) => wrongIds.has(q.id));
  }, [userAnswers, initialQuestions]);

  const finalPercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const passed = finalPercentage >= 70;

  const selectOption = useCallback(
    (index: number) => {
      if (isAnswerSubmitted) return;
      setSelectedOption(index);
      void safeHaptics('light');
    },
    [isAnswerSubmitted]
  );

  const submitAnswer = useCallback(() => {
    if (selectedOption === null || !currentQ) return;

    setIsAnswerSubmitted(true);
    const isCorrect = selectedOption === currentQ.correctIndex;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      void safeHaptics('success');
    } else {
      void safeHaptics('error');
    }

    const record: UserAnswerRecord = {
      questionId: currentQ.id,
      question: currentQ.question,
      options: currentQ.options,
      selectedIndex: selectedOption,
      correctIndex: currentQ.correctIndex,
      isCorrect,
      explanation: currentQ.explanation,
    };

    setUserAnswers((prev) => [...prev, record]);
  }, [selectedOption, currentQ]);

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
      void safeHaptics('light');
    } else {
      // Completed quiz run
      const pct = Math.round((score / totalQuestions) * 100);

      if (quiz) {
        recordQuizAttempt(setId, quiz.id, pct);
      }

      // Record study session (5 minutes, score)
      const minutesSpent = Math.max(2, Math.round(totalQuestions * 0.75));
      recordSession(0, minutesSpent, pct);

      setIsQuizComplete(true);
      void safeHaptics(pct >= 70 ? 'success' : 'warning');
    }
  }, [
    currentQuestionIndex,
    totalQuestions,
    score,
    quiz,
    recordQuizAttempt,
    setId,
    recordSession,
  ]);

  const retryWrongAnswers = useCallback(() => {
    if (wrongQuestions.length === 0) return;
    setActiveQuestions(wrongQuestions);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setUserAnswers([]);
    setIsQuizComplete(false);
    setIsRetryWrongMode(true);
    void safeHaptics('light');
  }, [wrongQuestions]);

  const restartFullQuiz = useCallback(() => {
    setActiveQuestions(initialQuestions);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setUserAnswers([]);
    setIsQuizComplete(false);
    setIsRetryWrongMode(false);
    void safeHaptics('light');
  }, [initialQuestions]);

  return {
    currentQ,
    currentQuestionIndex,
    totalQuestions,
    selectedOption,
    isAnswerSubmitted,
    score,
    progress,
    userAnswers,
    isQuizComplete,
    isRetryWrongMode,
    wrongQuestions,
    finalPercentage,
    passed,
    selectOption,
    submitAnswer,
    nextQuestion,
    retryWrongAnswers,
    restartFullQuiz,
  };
}
