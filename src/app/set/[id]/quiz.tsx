import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSetStore } from '../../../store';
import { useQuizSession } from '../../../hooks/useQuizSession';
import { QuizOption, QuizOptionState } from '../../../components/QuizOption';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { ProgressBar } from '../../../components/ProgressBar';
import { Confetti } from '../../../components/Confetti';

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const set = useSetStore((state) => state.getSet(id ?? ''));

  const quiz = set?.quizzes[0];

  const {
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
  } = useQuizSession({
    setId: id ?? '',
    quiz,
  });

  const [showAnswerReview, setShowAnswerReview] = useState(false);

  if (!set || !quiz || quiz.questions.length === 0) {
    return (
      <View className="flex-1 p-6 items-center justify-center">
        <EmptyState
          emoji="📝"
          title="No Quiz Available"
          description="This study set does not have any quiz questions generated yet."
          action={{
            label: 'View Summary',
            onPress: () => router.replace(`/set/${id}`),
          }}
        />
      </View>
    );
  }

  // SCORE RESULTS SCREEN
  if (isQuizComplete) {
    const wrongCount = totalQuestions - score;

    return (
      <View className="flex-1">
        <Confetti active={isQuizComplete && passed} />
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          <Card className="p-6 items-center mb-6">
            <Text className="text-5xl mb-2">{passed ? '🎉' : '💪'}</Text>

            {isRetryWrongMode && (
              <View className="bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 mb-2">
                <Text className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  Focus Mode · Missed Questions Practice
                </Text>
              </View>
            )}

            <View className="bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 mb-2 flex-row items-center gap-1.5">
              <Text className="text-xs">⚡</Text>
              <Text className="text-xs font-black text-amber-700 dark:text-amber-300">
                +{finalPercentage === 100 ? '50 XP (Perfect Score!)' : '25 XP Earned!'}
              </Text>
            </View>

            <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
              {passed ? 'Quiz Passed!' : 'Practice Makes Perfect!'}
            </Text>

            <Text className="text-xs font-semibold text-slate-400 mb-4 text-center">
              You scored {score} of {totalQuestions} correct ({finalPercentage}%)
            </Text>

          {/* Progress Bar */}
          <View className="w-full mb-6">
            <ProgressBar
              progress={finalPercentage}
              color={passed ? 'success' : 'streak'}
              height={10}
            />
          </View>

          {/* Score Summary Metrics */}
          <View className="w-full flex-row gap-3 mb-6">
            <View className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 items-center">
              <Text className="text-2xl font-black text-emerald-600">{score}</Text>
              <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                Correct
              </Text>
            </View>

            <View className="flex-1 bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 items-center">
              <Text className="text-2xl font-black text-rose-600">{wrongCount}</Text>
              <Text className="text-xs font-semibold text-rose-800 dark:text-rose-300 mt-0.5">
                Incorrect
              </Text>
            </View>
          </View>

          {/* Action CTAs */}
          <View className="w-full gap-2.5">
            {/* RETRY ONLY WRONG ANSWERS BUTTON */}
            {wrongQuestions.length > 0 && !isRetryWrongMode && (
              <Button
                label={`Retry Only Wrong Answers (${wrongQuestions.length}) 🎯`}
                variant="primary"
                size="md"
                fullWidth
                className="bg-amber-500 active:bg-amber-600 border-amber-600"
                onPress={retryWrongAnswers}
              />
            )}

            <Button
              label={isRetryWrongMode ? 'Retake Full Quiz' : 'Retake Entire Quiz'}
              variant="outline"
              size="md"
              fullWidth
              onPress={restartFullQuiz}
            />

            <Button
              label="Practice Flashcards"
              variant="secondary"
              size="md"
              fullWidth
              onPress={() => router.replace(`/set/${id}/flashcards`)}
            />

            <Button
              label="Back to Summary"
              variant="ghost"
              size="sm"
              fullWidth
              onPress={() => router.replace(`/set/${id}`)}
            />
          </View>
        </Card>

        {/* Detailed Question Review Toggle */}
        <View className="mb-4">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle answers review list"
            onPress={() => setShowAnswerReview((prev) => !prev)}
            className="flex-row justify-between items-center bg-white dark:bg-surface-darkSubtle p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
          >
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {showAnswerReview ? 'Hide' : 'Review'} Question Breakdown (
              {userAnswers.length})
            </Text>
            <Text className="text-base text-slate-400">
              {showAnswerReview ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Question Review Cards */}
        {showAnswerReview && (
          <View className="gap-3">
            {userAnswers.map((item, idx) => (
              <Card
                key={idx}
                className={`p-4 border ${
                  item.isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/20'
                    : 'border-rose-200 dark:border-rose-900 bg-rose-50/20'
                }`}
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-xs font-bold text-slate-500 uppercase">
                    Question {idx + 1}
                  </Text>
                  <View
                    className={`px-2 py-0.5 rounded-full ${
                      item.isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950/60'
                        : 'bg-rose-100 dark:bg-rose-950/60'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        item.isCorrect ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {item.isCorrect ? 'Correct ✓' : 'Missed ✕'}
                    </Text>
                  </View>
                </View>

                <Text className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {item.question}
                </Text>

                <View className="gap-1 mb-2">
                  <Text className="text-xs text-slate-600 dark:text-slate-400">
                    <Text className="font-semibold">Your answer: </Text>
                    {item.options[item.selectedIndex] ?? 'None'}
                  </Text>
                  {!item.isCorrect && (
                    <Text className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      Correct answer: {item.options[item.correctIndex]}
                    </Text>
                  )}
                </View>

                <Text className="text-[11px] text-slate-500 italic">
                  💡 {item.explanation}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

  // ACTIVE QUESTION SCREEN
  if (!currentQ) {
    return null;
  }

  const getOptionState = (index: number): QuizOptionState => {
    if (!isAnswerSubmitted) {
      return selectedOption === index ? 'selected' : 'default';
    }
    if (index === currentQ.correctIndex) {
      return 'correct';
    }
    if (selectedOption === index) {
      return 'incorrect';
    }
    return 'default';
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header Info */}
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Question {currentQuestionIndex + 1} of {totalQuestions}
          </Text>
          {isRetryWrongMode && (
            <View className="bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
              <Text className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                Wrong Answers Only
              </Text>
            </View>
          )}
        </View>

        <Text className="text-xs font-bold text-primary-600">
          Score: {score}/{currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)}
        </Text>
      </View>

      <ProgressBar progress={progress} height={6} className="mb-6" />

      {/* Question Card */}
      <Card className="p-5 mb-5">
        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 leading-relaxed">
          {currentQ.question}
        </Text>
      </Card>

      {/* Options List */}
      <View className="mb-4">
        {currentQ.options.map((option, idx) => (
          <QuizOption
            key={idx}
            index={idx}
            optionText={option}
            state={getOptionState(idx)}
            disabled={isAnswerSubmitted}
            onPress={() => selectOption(idx)}
          />
        ))}
      </View>

      {/* Explanation Box */}
      {isAnswerSubmitted && (
        <Card
          className={`p-4 mb-6 border ${
            selectedOption === currentQ.correctIndex
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
              : 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
          }`}
        >
          <View className="flex-row items-center gap-1.5 mb-1">
            <Text className="text-sm">
              {selectedOption === currentQ.correctIndex ? '🎉' : '💡'}
            </Text>
            <Text
              className={`text-xs font-bold uppercase ${
                selectedOption === currentQ.correctIndex
                  ? 'text-emerald-800 dark:text-emerald-300'
                  : 'text-rose-800 dark:text-rose-300'
              }`}
            >
              {selectedOption === currentQ.correctIndex
                ? 'Correct! Explanation:'
                : 'Incorrect. Key takeaway:'}
            </Text>
          </View>
          <Text className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {currentQ.explanation}
          </Text>
        </Card>
      )}

      {/* Action Button */}
      {!isAnswerSubmitted ? (
        <Button
          label="Check Answer"
          variant="primary"
          size="lg"
          fullWidth
          disabled={selectedOption === null}
          onPress={submitAnswer}
        />
      ) : (
        <Button
          label={
            currentQuestionIndex === totalQuestions - 1
              ? 'View Score Results 🎉'
              : 'Next Question →'
          }
          variant="primary"
          size="lg"
          fullWidth
          onPress={nextQuestion}
        />
      )}
    </ScrollView>
  );
}
