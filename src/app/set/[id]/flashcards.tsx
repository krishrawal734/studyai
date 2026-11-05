import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSetStore } from '../../../store';
import { useFlashcardSession } from '../../../hooks/useFlashcardSession';
import { FlashCard } from '../../../components/FlashCard';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { ProgressBar } from '../../../components/ProgressBar';
import { Chip } from '../../../components/Chip';
import { Input } from '../../../components/Input';
import { PomodoroTimer } from '../../../components/PomodoroTimer';
import { Confetti } from '../../../components/Confetti';
import { AITutorModal } from '../../../components/AITutorModal';
import { GradeAnswerModal } from '../../../components/GradeAnswerModal';
import { aiService } from '../../../services/ai';
import { safeHaptics, speakText, stopSpeech, calculateNextReviewDate } from '../../../utils';
import { Card as CardType } from '../../../types';

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const set = useSetStore((state) => state.getSet(id ?? ''));
  const addCardToSet = useSetStore((state) => state.addCardToSet);
  const updateCard = useSetStore((state) => state.updateCard);
  const updateCardBox = useSetStore((state) => state.updateCardBox);
  const setCardsHighYield = useSetStore((state) => state.setCardsHighYield);

  const {
    currentCard,
    rawCard,
    currentIndex,
    totalCards,
    progress,
    isFlipped,
    isCompleted,
    isReversed,
    isShuffled,
    starredOnly,
    highYieldOnly,
    deckStats,
    sessionMastered,
    sessionNeedsReview,
    filterMode,
    flipCard,
    markGotIt,
    markReviewAgain,
    prevCard,
    advanceToNext,
    restartSession,
    setFilterMode,
    toggleReversed,
    toggleShuffle,
    toggleStarredOnly,
    toggleHighYieldOnly,
    toggleStarCurrentCard,
    syncCards,
  } = useFlashcardSession({
    setId: id ?? '',
    initialCards: set?.cards ?? [],
  });

  // Modal states
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showAITutor, setShowAITutor] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [isPredictingCram, setIsPredictingCram] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  // Commute / Podcast Hands-Free Mode state
  const [isCommuteActive, setIsCommuteActive] = useState(false);
  const [commuteStep, setCommuteStep] = useState<'idle' | 'question' | 'thinking' | 'answer' | 'advancing'>('idle');
  const commuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCommuteRunningRef = useRef(false);

  useEffect(() => {
    isCommuteRunningRef.current = isCommuteActive;
    if (!isCommuteActive) {
      void stopSpeech();
      if (commuteTimerRef.current) clearTimeout(commuteTimerRef.current);
      return;
    }

    if (!currentCard || isCompleted) return;

    // Step 1: Speak Question after a brief buffer
    commuteTimerRef.current = setTimeout(() => {
      if (!isCommuteRunningRef.current) return;
      setCommuteStep('question');
      void speakText(`Question. ${currentCard.question}`, () => {
        if (!isCommuteRunningRef.current) return;
        // Step 2: 2.5s Thinking Pause
        setCommuteStep('thinking');
        commuteTimerRef.current = setTimeout(() => {
          if (!isCommuteRunningRef.current) return;
          // Step 3: Flip Card
          if (!isFlipped) flipCard();
          // Step 4: Speak Answer
          setCommuteStep('answer');
          void speakText(`Answer. ${currentCard.answer}`, () => {
            if (!isCommuteRunningRef.current) return;
            // Step 5: Brief pause before advancing
            setCommuteStep('advancing');
            commuteTimerRef.current = setTimeout(() => {
              if (!isCommuteRunningRef.current) return;
              markGotIt();
            }, 1800);
          });
        }, 2500);
      });
    }, 100);

    return () => {
      void stopSpeech();
      if (commuteTimerRef.current) clearTimeout(commuteTimerRef.current);
    };
  }, [isCommuteActive, currentIndex, isCompleted, currentCard, flipCard, isFlipped, markGotIt]);

  useEffect(() => {
    return () => {
      isCommuteRunningRef.current = false;
      void stopSpeech();
      if (commuteTimerRef.current) clearTimeout(commuteTimerRef.current);
    };
  }, []);

  // Handle Edit Card
  const openEditModal = (card: CardType) => {
    setEditingCard(card);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  };

  const saveEditCard = () => {
    if (!editingCard || !id) return;
    if (!editQuestion.trim() || !editAnswer.trim()) return;

    updateCard(id, editingCard.id, editQuestion, editAnswer);
    void safeHaptics('success');

    // Sync active set deck
    const updatedSet = useSetStore.getState().getSet(id);
    if (updatedSet) syncCards(updatedSet.cards);

    setEditingCard(null);
  };

  // Handle Add Card
  const handleAddCard = () => {
    if (!id || !newQuestion.trim() || !newAnswer.trim()) return;

    addCardToSet(id, newQuestion, newAnswer);
    void safeHaptics('success');

    const updatedSet = useSetStore.getState().getSet(id);
    if (updatedSet) syncCards(updatedSet.cards);

    setNewQuestion('');
    setNewAnswer('');
    setShowAddModal(false);
  };

  const handleToggleCram = async () => {
    if (!set) return;
    void safeHaptics('medium');

    if (!highYieldOnly) {
      const hasHighYieldTagged = set.cards.some((c) => c.highYield);
      if (!hasHighYieldTagged && set.cards.length > 0) {
        setIsPredictingCram(true);
        try {
          const ids = await aiService.predictHighYieldCards(set.cards);
          setCardsHighYield(set.id, ids);
          syncCards(
            set.cards.map((c) => ({
              ...c,
              highYield: ids.includes(c.id),
            }))
          );
        } catch {
          const count = Math.max(1, Math.ceil(set.cards.length * 0.4));
          const ids = set.cards.slice(0, count).map((c) => c.id);
          setCardsHighYield(set.id, ids);
        } finally {
          setIsPredictingCram(false);
        }
      }
    }

    toggleHighYieldOnly();
  };

  const handleApplyGradeBox = (box: 1 | 2 | 3) => {
    if (!currentCard || !id) return;
    updateCardBox(id, currentCard.id, box, calculateNextReviewDate(box));
    if (box === 3) {
      markGotIt();
    } else {
      markReviewAgain();
    }
  };

  if (!set || set.cards.length === 0) {
    return (
      <View className="flex-1 p-6 items-center justify-center">
        <EmptyState
          emoji="🃏"
          title="No Flashcards Available"
          description="This study set does not have any generated cards yet."
          action={{
            label: 'View Summary',
            onPress: () => router.replace(`/set/${id}`),
          }}
        />
      </View>
    );
  }

  // Session Completed Screen
  if (isCompleted) {
    const totalSessionReviewed = sessionMastered + sessionNeedsReview;
    const masteryPercentage =
      totalSessionReviewed > 0
        ? Math.round((sessionMastered / totalSessionReviewed) * 100)
        : 100;

    return (
      <View className="flex-1">
        <Confetti active={isCompleted} />
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <Card className="p-6 items-center mb-6">
            <Text className="text-5xl mb-3">🎉</Text>
            <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
              Deck Session Complete!
            </Text>
            <View className="bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 mb-2 flex-row items-center gap-1.5">
              <Text className="text-xs">⚡</Text>
              <Text className="text-xs font-black text-amber-700 dark:text-amber-300">
                +{totalSessionReviewed * 10} XP Earned!
              </Text>
            </View>
            <Text className="text-xs font-bold text-emerald-600 mb-1">
              Retention Accuracy: {masteryPercentage}%
            </Text>
            <Text className="text-xs text-slate-400 text-center mb-6 max-w-[280px]">
              You reviewed {totalSessionReviewed} cards. Your spaced repetition intervals
              have been updated.
            </Text>

          {/* Session Performance Breakdown */}
          <View className="w-full flex-row gap-3 mb-6">
            <View className="flex-1 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900 items-center">
              <Text className="text-2xl font-black text-emerald-600">
                {sessionMastered}
              </Text>
              <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                Got It / Advanced
              </Text>
            </View>

            <View className="flex-1 bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900 items-center">
              <Text className="text-2xl font-black text-rose-600">
                {sessionNeedsReview}
              </Text>
              <Text className="text-xs font-semibold text-rose-800 dark:text-rose-300 mt-0.5">
                Review Again (Box 1)
              </Text>
            </View>
          </View>

          {/* Current Leitner Box Distribution */}
          <View className="w-full bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6">
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
              Total Deck Leitner Status
            </Text>

            <View className="gap-2">
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <Text className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Box 1 (Daily Review)
                  </Text>
                </View>
                <Text className="text-xs font-bold text-rose-600">
                  {deckStats.box1} cards
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <Text className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Box 2 (Every 3 Days)
                  </Text>
                </View>
                <Text className="text-xs font-bold text-amber-600">
                  {deckStats.box2} cards
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Box 3 (Mastered · 7 Days)
                  </Text>
                </View>
                <Text className="text-xs font-bold text-emerald-600">
                  {deckStats.box3} cards
                </Text>
              </View>
            </View>
          </View>

          {/* Action CTAs */}
          <View className="w-full gap-2.5">
            <Button
              label="Study Entire Deck Again"
              variant="primary"
              size="md"
              fullWidth
              onPress={() => restartSession('all')}
            />

            {deckStats.box1 > 0 && (
              <Button
                label={`Review Only Box 1 (${deckStats.box1} cards)`}
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => restartSession('box1')}
              />
            )}

            <Button
              label="Take Practice Quiz"
              variant="outline"
              size="md"
              fullWidth
              onPress={() => router.replace(`/set/${id}/quiz`)}
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
      </ScrollView>
    </View>
  );
}

  return (
    <ScrollView
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Leitner Box Filter Chips + Starred Pill */}
      <View className="mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          <Chip
            label={`All (${set.cards.length})`}
            selected={filterMode === 'all' && !starredOnly}
            onPress={() => {
              if (starredOnly) toggleStarredOnly();
              setFilterMode('all');
            }}
            size="sm"
          />
          <Chip
            label={`Box 1 (${deckStats.box1})`}
            variant="error"
            selected={filterMode === 'box1' && !starredOnly}
            onPress={() => {
              if (starredOnly) toggleStarredOnly();
              setFilterMode('box1');
            }}
            size="sm"
          />
          <Chip
            label={`Box 2 (${deckStats.box2})`}
            variant="warning"
            selected={filterMode === 'box2' && !starredOnly}
            onPress={() => {
              if (starredOnly) toggleStarredOnly();
              setFilterMode('box2');
            }}
            size="sm"
          />
          <Chip
            label={`Box 3 (${deckStats.box3})`}
            variant="success"
            selected={filterMode === 'box3' && !starredOnly}
            onPress={() => {
              if (starredOnly) toggleStarredOnly();
              setFilterMode('box3');
            }}
            size="sm"
          />
          {deckStats.starred > 0 && (
            <Chip
              label={`⭐ Starred (${deckStats.starred})`}
              variant="warning"
              selected={starredOnly}
              onPress={toggleStarredOnly}
              size="sm"
            />
          )}
        </ScrollView>
      </View>

      {/* Control Bar: Horizontally scrollable so it NEVER overflows on small screens */}
      <View className="mb-4 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: 6, paddingHorizontal: 2 }}
        >
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle shuffle card order"
            onPress={toggleShuffle}
            className={`px-3 py-1.5 rounded-xl border ${
              isShuffled
                ? 'bg-primary-600 border-primary-600'
                : 'bg-white dark:bg-surface-darkSubtle border-slate-200 dark:border-slate-700'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isShuffled ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              🔀 Shuffle
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Toggle reverse cards"
            onPress={toggleReversed}
            className={`px-3 py-1.5 rounded-xl border ${
              isReversed
                ? 'bg-primary-600 border-primary-600'
                : 'bg-white dark:bg-surface-darkSubtle border-slate-200 dark:border-slate-700'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isReversed ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              🔄 Reverse
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Commute audio hands-free study mode"
            onPress={() => {
              void safeHaptics('medium');
              setIsCommuteActive((prev) => {
                if (prev) {
                  setCommuteStep('idle');
                  void stopSpeech();
                }
                return !prev;
              });
            }}
            className={`px-3 py-1.5 rounded-xl border ${
              isCommuteActive
                ? 'bg-emerald-600 border-emerald-600'
                : 'bg-white dark:bg-surface-darkSubtle border-slate-200 dark:border-slate-700'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isCommuteActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {isCommuteActive ? '🎧 Auto' : '🎧 Commute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="AI High-Yield Exam Cram Mode"
            onPress={handleToggleCram}
            disabled={isPredictingCram}
            className={`px-3 py-1.5 rounded-xl border ${
              highYieldOnly
                ? 'bg-amber-500 border-amber-500'
                : 'bg-white dark:bg-surface-darkSubtle border-slate-200 dark:border-slate-700'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                highYieldOnly ? 'text-white' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {isPredictingCram ? '⚡ AI...' : '⚡ Cram'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Pomodoro Timer"
            onPress={() => setShowPomodoro(true)}
            className="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700 flex-row items-center gap-1"
          >
            <Text className="text-xs">⏱️</Text>
            <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Focus
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Add custom card"
            onPress={() => setShowAddModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-primary-600 flex-row items-center gap-1 shadow-sm"
          >
            <Text className="text-xs font-black text-white leading-none">+</Text>
            <Text className="text-xs font-bold text-white">Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Progress & Card Counter */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Card {totalCards > 0 ? currentIndex + 1 : 0} of {totalCards}
        </Text>
        <Text className="text-xs font-bold text-primary-600">
          {Math.round(progress)}%
        </Text>
      </View>

      <ProgressBar progress={progress} height={6} className="mb-5" />

      {/* Empty Filter State */}
      {totalCards === 0 || !currentCard ? (
        <Card className="items-center justify-center py-12 mb-6">
          <Text className="text-4xl mb-2">🎉</Text>
          <Text className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            No cards in this view
          </Text>
          <Text className="text-xs text-slate-400 text-center max-w-[240px] mb-4">
            {starredOnly
              ? 'You have not starred any cards in this study set yet.'
              : `No cards are currently filed in ${filterMode.toUpperCase()}.`}
          </Text>
          <Button
            label="View All Cards"
            size="sm"
            variant="outline"
            onPress={() => restartSession('all')}
          />
        </Card>
      ) : (
        <>
          {/* Commute Audio Active Banner */}
          {isCommuteActive && (
            <View className="mb-3 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <Text className="text-lg">🎧</Text>
                <View className="flex-1">
                  <Text className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                    Commute Audio Mode Active
                  </Text>
                  <Text className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    {commuteStep === 'question' && 'Speaking question...'}
                    {commuteStep === 'thinking' && 'Thinking pause (recalling answer)...'}
                    {commuteStep === 'answer' && 'Speaking answer...'}
                    {commuteStep === 'advancing' && 'Got it! Advancing to next card...'}
                    {commuteStep === 'idle' && 'Ready'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  void safeHaptics('light');
                  setIsCommuteActive(false);
                }}
                className="bg-emerald-600 px-3 py-1.5 rounded-xl active:bg-emerald-700"
              >
                <Text className="text-xs font-bold text-white">Pause ⏸</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* AI Exam Cram Active Banner */}
          {highYieldOnly && (
            <View className="mb-3 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-300 dark:border-amber-800 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Text className="text-base">🔥</Text>
                <View>
                  <Text className="text-xs font-black text-amber-900 dark:text-amber-100">
                    AI Exam Cram Mode Active
                  </Text>
                  <Text className="text-[10px] text-amber-700 dark:text-amber-300">
                    Prioritizing high-yield questions for upcoming tests
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleToggleCram}
                className="bg-amber-500 px-2.5 py-1 rounded-xl"
              >
                <Text className="text-[10px] font-bold text-white">Exit Cram</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 3D Animated Flip Card with Swipe & Audio */}
          <View className="mb-4 w-full">
            <FlashCard
              question={currentCard.question}
              answer={currentCard.answer}
              box={currentCard.box}
              isFlipped={isFlipped}
              starred={rawCard?.starred}
              onFlip={flipCard}
              onSwipeRight={markGotIt}
              onSwipeLeft={markReviewAgain}
              onToggleStar={toggleStarCurrentCard}
              onEdit={() => rawCard && openEditModal(rawCard)}
            />
          </View>

          {/* AI Tutor & AI Grader Interactive Action Bar */}
          <View className="flex-row gap-2.5 mb-4">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Ask AI Tutor for explanation or mnemonics"
              onPress={() => {
                void safeHaptics('light');
                setShowAITutor(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex-row items-center justify-center gap-1.5 active:opacity-70 shadow-xs"
            >
              <Text className="text-sm">🤖</Text>
              <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
                Ask AI Tutor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Grade my answer with AI"
              onPress={() => {
                void safeHaptics('light');
                setShowGradeModal(true);
              }}
              className="flex-1 py-2.5 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex-row items-center justify-center gap-1.5 active:opacity-70 shadow-xs"
            >
              <Text className="text-sm">✍️</Text>
              <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                Grade My Answer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Decision Action Buttons */}
          <View className="flex-row gap-3 mb-5">
            <Button
              label="Review Again (Box 1)"
              variant="outline"
              size="md"
              className="flex-1 border-rose-300 dark:border-rose-900 active:bg-rose-50 dark:active:bg-rose-950/30"
              onPress={markReviewAgain}
            />
            <Button
              label="Got It! (Advance)"
              variant="success"
              size="md"
              className="flex-1"
              onPress={markGotIt}
            />
          </View>

          {/* Navigation Controls */}
          <View className="flex-row justify-between items-center">
            <Button
              label="← Previous"
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
              onPress={prevCard}
            />
            <Button
              label="Skip →"
              variant="ghost"
              size="sm"
              disabled={currentIndex === totalCards - 1}
              onPress={advanceToNext}
            />
          </View>
        </>
      )}

      {/* Pomodoro Focus Timer Modal */}
      <PomodoroTimer
        visible={showPomodoro}
        onClose={() => setShowPomodoro(false)}
        subjectTitle={set.title}
      />

      {/* EDIT CARD MODAL */}
      <Modal
        visible={Boolean(editingCard)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCard(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-center p-5"
        >
          <View className="w-full max-w-lg mx-auto bg-white dark:bg-surface-darkSubtle p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
            <Text className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
              Edit Flashcard
            </Text>
            <Text className="text-xs text-slate-400 mb-5">
              Update the question or answer wording
            </Text>

            <Input
              label="Question"
              value={editQuestion}
              onChangeText={setEditQuestion}
              multiline
              numberOfLines={3}
              containerClassName="mb-4"
            />

            <Input
              label="Answer"
              value={editAnswer}
              onChangeText={setEditAnswer}
              multiline
              numberOfLines={4}
              containerClassName="mb-6"
            />

            <View className="flex-row gap-3">
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                className="flex-1"
                onPress={() => setEditingCard(null)}
              />
              <Button
                label="Save Changes"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!editQuestion.trim() || !editAnswer.trim()}
                onPress={saveEditCard}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADD NEW CARD MODAL */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/60 justify-center p-5"
        >
          <View className="w-full max-w-lg mx-auto bg-white dark:bg-surface-darkSubtle p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
            <Text className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
              Add Custom Flashcard
            </Text>
            <Text className="text-xs text-slate-400 mb-5">
              Add your own flashcard to this study set
            </Text>

            <Input
              label="Question / Concept"
              placeholder="e.g. What is the powerhouse of the cell?"
              value={newQuestion}
              onChangeText={setNewQuestion}
              multiline
              numberOfLines={3}
              containerClassName="mb-4"
            />

            <Input
              label="Answer"
              placeholder="e.g. Mitochondria"
              value={newAnswer}
              onChangeText={setNewAnswer}
              multiline
              numberOfLines={4}
              containerClassName="mb-6"
            />

            <View className="flex-row gap-3">
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                className="flex-1"
                onPress={() => setShowAddModal(false)}
              />
              <Button
                label="Add Card"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!newQuestion.trim() || !newAnswer.trim()}
                onPress={handleAddCard}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI SOCRATIC TUTOR MODAL */}
      {currentCard && (
        <AITutorModal
          visible={showAITutor}
          onClose={() => setShowAITutor(false)}
          question={currentCard.question}
          answer={currentCard.answer}
        />
      )}

      {/* AI GRADE MY ANSWER MODAL */}
      {currentCard && (
        <GradeAnswerModal
          visible={showGradeModal}
          onClose={() => setShowGradeModal(false)}
          question={currentCard.question}
          referenceAnswer={currentCard.answer}
          onApplyBox={handleApplyGradeBox}
        />
      )}
    </ScrollView>
  );
}
