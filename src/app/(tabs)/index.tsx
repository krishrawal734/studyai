import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { useSetStore, useStatsStore } from '../../store';
import { StreakCard } from '../../components/StreakCard';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Chip } from '../../components/Chip';
import { ProgressBar } from '../../components/ProgressBar';
import { aiService } from '../../services/ai';
import { calculateNextReviewDate, safeAlert, safeHaptics } from '../../utils';
import { LeitnerBox } from '../../types';

const DAILY_CARD_GOAL = 10;

export default function HomeScreen() {
  const sets = useSetStore((state) => state.sets);
  const addSet = useSetStore((state) => state.addSet);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const currentStreak = useStatsStore((state) => state.currentStreak);
  const longestStreak = useStatsStore((state) => state.longestStreak);
  const history = useStatsStore((state) => state.history);
  const xp = useStatsStore((state) => state.xp);
  const level = useStatsStore((state) => state.level);
  const streakJustGrew = useStatsStore((state) => state.streakJustGrew);
  const streakFreezes = useStatsStore((state) => state.streakFreezes);
  const streakProtectedByFreeze = useStatsStore((state) => state.streakProtectedByFreeze);
  const clearStreakGrewFlag = useStatsStore((state) => state.clearStreakGrewFlag);
  const checkStreakIntegrity = useStatsStore((state) => state.checkStreakIntegrity);

  // Validate streak against device clock on mount
  useEffect(() => {
    checkStreakIntegrity();
  }, [checkStreakIntegrity]);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayFormatted = useMemo(() => format(new Date(), 'EEEE, MMMM d'), []);

  // Greeting based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: '☀️' };
    if (hour < 17) return { text: 'Good afternoon', icon: '🌤️' };
    return { text: 'Good evening', icon: '🌙' };
  }, []);

  const totalCards = (sets || []).reduce((acc, s) => acc + (s.cards ? s.cards.length : 0), 0);
  const masteredCards = (sets || []).reduce(
    (acc, s) => acc + (s.cards ? s.cards.filter((c) => c.box === 3).length : 0),
    0
  );

  // Daily goal calculation
  const todayEntry = (history || []).find((h) => h.date === todayStr);
  const cardsStudiedToday = todayEntry?.cardsStudied ?? 0;
  const minutesStudiedToday = todayEntry?.minutesStudied ?? 0;
  const goalProgress = Math.min(
    100,
    Math.round((cardsStudiedToday / DAILY_CARD_GOAL) * 100)
  );

  // Find due cards for spaced repetition
  const { dueCardsCount, topDueSet } = useMemo<{
    dueCardsCount: number;
    topDueSet: { id: string; title: string; count: number } | null;
  }>(() => {
    let count = 0;
    let bestSet: { id: string; title: string; count: number } | null = null;

    (sets || []).forEach((set) => {
      const cards = set.cards || [];
      const dueInSet = cards.filter((c) => {
        if (c.box === 3) return false;
        if (!c.nextReview) return true;
        return c.nextReview.slice(0, 10) <= todayStr;
      }).length;

      count += dueInSet;
      if (dueInSet > 0 && (!bestSet || dueInSet > bestSet.count)) {
        bestSet = { id: set.id, title: set.title, count: dueInSet };
      }
    });

    return { dueCardsCount: count, topDueSet: bestSet };
  }, [sets, todayStr]);

  // Upcoming Exam Countdown
  const upcomingExam = useMemo(() => {
    const today = new Date();
    const setsWithExam = (sets || [])
      .filter((s) => Boolean(s.examDate))
      .map((s) => {
        const daysLeft = differenceInCalendarDays(parseISO(s.examDate!), today);
        const unmastered = (s.cards || []).filter((c) => c.box < 3).length;
        const quota = daysLeft <= 0 ? unmastered : Math.ceil(unmastered / Math.max(1, daysLeft));
        return {
          setId: s.id,
          title: s.title,
          subject: s.subject,
          examDate: s.examDate!,
          daysLeft,
          unmastered,
          quota,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return setsWithExam[0] ?? null;
  }, [sets]);

  const box1Cards = useMemo(() => {
    return (sets || []).flatMap((s) => (s.cards || []).filter((c) => c.box === 1));
  }, [sets]);

  const handleGenerateRemediationDrill = async () => {
    if (isDiagnosing || box1Cards.length === 0) return;
    setIsDiagnosing(true);
    void safeHaptics('medium');

    try {
      const diagnosis = await aiService.generateWeakSpotRemediation(box1Cards);
      const newSet = addSet({
        title: `🎯 Weak-Spot Drill: ${diagnosis.focusTopic}`,
        subject: `Remediation · ${diagnosis.focusTopic}`,
        summary: diagnosis.diagnosis,
        keyPoints: [
          `Targeted focus: ${diagnosis.focusTopic}`,
          'Synthesized from your Box 1 missed/struggling flashcards.',
          'Review these cards daily until they advance to Box 2 and Box 3.',
        ],
        sourceType: 'text',
        cards: diagnosis.cards.map((c) => ({
          id: 'card_' + Date.now().toString() + '_' + Math.random().toString(36).slice(2, 6),
          question: c.question,
          answer: c.answer,
          box: 1 as LeitnerBox,
          nextReview: calculateNextReviewDate(1),
          starred: true,
          highYield: true,
        })),
        quizzes: [
          {
            id: 'quiz_' + Date.now().toString(),
            questions: diagnosis.quizzes.map((q, idx) => ({
              id: `q_${Date.now()}_${idx}`,
              question: q.question,
              options: q.options,
              correctIndex: q.correctIndex,
              explanation: q.explanation,
            })),
            lastScore: null,
            attempts: 0,
          },
        ],
      });

      void safeHaptics('success');
      safeAlert(
        'Remediation Drill Ready! 🎯',
        `StudyAI analyzed your weak spots and generated "${newSet.title}". Let's master these concepts!`
      );
      router.push(`/set/${newSet.id}`);
    } catch {
      safeAlert('Remediation Error', 'Could not generate weak-spot drill. Please try again.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-subtle dark:bg-surface-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View className="flex-row justify-between items-center mb-5">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-black text-slate-900 dark:text-slate-100">
                Study<Text className="text-primary-600">AI</Text>
              </Text>
             
            </View>
            <Text className="text-xs font-semibold text-slate-400 mt-0.5">
              {greeting.text} {greeting.icon} · {todayFormatted}
            </Text>
          </View>

          <View className="flex-row items-center gap-2.5">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={`Level ${level}, ${xp} XP. View achievements.`}
              onPress={() => {
                void safeHaptics('light');
                router.push('/(tabs)/progress');
              }}
              className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800"
            >
              <Text className="text-xs">⚡</Text>
              <Text className="text-xs font-black text-amber-700 dark:text-amber-300">
                Lv. {level}
              </Text>
              <Text className="text-[10px] font-bold text-amber-600/80 dark:text-amber-400">
                {xp} XP
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Create study set"
              onPress={() => {
                void safeHaptics('light');
                router.push('/(tabs)/create');
              }}
              className="w-10 h-10 rounded-full bg-primary-600 items-center justify-center shadow-sm"
            >
              <Text className="text-xl text-white font-bold leading-none">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Component with Animation */}
        <StreakCard
          currentStreak={currentStreak}
          longestStreak={longestStreak}
          history={history}
          streakJustGrew={streakJustGrew}
          streakFreezes={streakFreezes}
          streakProtectedByFreeze={streakProtectedByFreeze}
          onClearStreakGrew={clearStreakGrewFlag}
          className="mb-5"
        />

        {/* Daily Goal Progress Bar */}
        <Card className="p-4 mb-5">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Daily Goal
              </Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
                  cardsStudiedToday >= DAILY_CARD_GOAL
                    ? 'bg-emerald-100 dark:bg-emerald-950/50'
                    : 'bg-primary-50 dark:bg-primary-950/50'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    cardsStudiedToday >= DAILY_CARD_GOAL
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-primary-700 dark:text-primary-400'
                  }`}
                >
                  {cardsStudiedToday >= DAILY_CARD_GOAL ? 'Target Reached! 🎯' : 'In Progress'}
                </Text>
              </View>
            </View>

            <Text className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
              {cardsStudiedToday}/{DAILY_CARD_GOAL} cards
            </Text>
          </View>

          <ProgressBar
            progress={goalProgress}
            color={cardsStudiedToday >= DAILY_CARD_GOAL ? 'success' : 'primary'}
            height={8}
            className="mb-2"
          />

          <View className="flex-row justify-between items-center">
            <Text className="text-[11px] text-slate-400">
              {cardsStudiedToday >= DAILY_CARD_GOAL
                ? 'Outstanding commitment today! Keep pushing forward.'
                : `${DAILY_CARD_GOAL - cardsStudiedToday} more cards to hit your daily goal.`}
            </Text>
            {minutesStudiedToday > 0 && (
              <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                ⏱ {minutesStudiedToday}m studied
              </Text>
            )}
          </View>
        </Card>

        {/* Upcoming Exam Countdown Widget */}
        {upcomingExam !== null && (
          <View className="mb-5 bg-indigo-50 dark:bg-indigo-950/40 rounded-3xl p-4 border border-indigo-200 dark:border-indigo-800/80">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">🎯</Text>
                <View>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-black text-indigo-900 dark:text-indigo-100">
                      Upcoming Exam Target
                    </Text>
                    <View className="bg-indigo-200/70 dark:bg-indigo-900 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-200">
                        {upcomingExam.daysLeft > 1
                          ? `${upcomingExam.daysLeft} days left`
                          : upcomingExam.daysLeft === 1
                          ? 'Tomorrow!'
                          : upcomingExam.daysLeft === 0
                          ? 'Today!'
                          : 'Overdue'}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    {upcomingExam.title} · {upcomingExam.subject}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-1 pt-2 border-t border-indigo-200/60 dark:border-indigo-900">
              <Text className="text-[11px] text-indigo-800 dark:text-indigo-300 font-medium">
                Daily Quota: <Text className="font-bold">{upcomingExam.quota} cards</Text> to master
              </Text>

              <Button
                label="Study Set"
                size="sm"
                variant="primary"
                className="bg-indigo-600 border-indigo-600 py-1 px-3"
                onPress={() => {
                  void safeHaptics('light');
                  router.push(`/set/${upcomingExam.setId}`);
                }}
              />
            </View>
          </View>
        )}

        {/* Spaced Repetition Due Queue Callout */}
        {topDueSet !== null && topDueSet.count > 0 && (
          <View className="mb-5 bg-amber-50 dark:bg-amber-950/40 rounded-3xl p-4 border border-amber-200 dark:border-amber-800/80">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg">⏰</Text>
                <View>
                  <Text className="text-sm font-black text-amber-900 dark:text-amber-100">
                    {dueCardsCount} {dueCardsCount === 1 ? 'Card' : 'Cards'} Due for Review
                  </Text>
                  <Text className="text-xs text-amber-700 dark:text-amber-300">
                    Spaced repetition queue ready in {topDueSet.title}
                  </Text>
                </View>
              </View>
            </View>

            <Button
              label="Review Due Cards Now"
              size="sm"
              variant="primary"
              className="mt-2 bg-amber-600 border-amber-600"
              onPress={() => {
                void safeHaptics('light');
                router.push(`/set/${topDueSet.id}/flashcards`);
              }}
            />
          </View>
        )}

        {/* AI Weak-Spot Diagnostic Widget */}
        {box1Cards.length > 0 && (
          <View className="mb-5 bg-rose-50 dark:bg-rose-950/40 rounded-3xl p-4 border border-rose-200 dark:border-rose-800/80">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-xl">🔬</Text>
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-sm font-black text-rose-900 dark:text-rose-100">
                      AI Weak-Spot Diagnostic
                    </Text>
                    <View className="bg-rose-200/80 dark:bg-rose-900 px-2 py-0.5 rounded-full">
                      <Text className="text-[10px] font-extrabold text-rose-800 dark:text-rose-200">
                        {box1Cards.length} in Box 1
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    AI detected concepts you struggled with in recent reviews.
                  </Text>
                </View>
              </View>
            </View>

            <Button
              label={isDiagnosing ? 'Diagnosing Weak Spots...' : 'Generate AI Remediation Drill'}
              size="sm"
              variant="primary"
              disabled={isDiagnosing}
              className="mt-2 bg-rose-600 border-rose-600"
              onPress={handleGenerateRemediationDrill}
            />
          </View>
        )}

        {/* Quick Stats Summary */}
        <View className="flex-row gap-3 mb-6">
          <Card className="flex-1 p-3.5">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Study Sets
            </Text>
            <Text className="text-2xl font-black text-primary-600 mt-1">
              {sets.length}
            </Text>
          </Card>

          <Card className="flex-1 p-3.5">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Cards
            </Text>
            <Text className="text-2xl font-black text-indigo-600 mt-1">
              {totalCards}
            </Text>
          </Card>

          <Card className="flex-1 p-3.5">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mastered
            </Text>
            <Text className="text-2xl font-black text-emerald-600 mt-1">
              {masteredCards}
            </Text>
          </Card>
        </View>

        {/* Recent Sets Section */}
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
            Recent Study Sets
          </Text>
          {sets.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                void safeHaptics('light');
                router.push('/(tabs)/library');
              }}
            >
              <Text className="text-xs font-semibold text-primary-600">View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {sets.length === 0 ? (
          <EmptyState
            emoji="✨"
            title="No study sets yet"
            description="Create your first AI-powered study set from text, photos, or documents to begin studying."
            action={{
              label: 'Create Study Set',
              onPress: () => {
                void safeHaptics('light');
                router.push('/(tabs)/create');
              },
            }}
          />
        ) : (
          <View className="gap-3">
            {sets.slice(0, 3).map((item) => (
              <Card key={item.id} className="p-4">
                {/* Clickable Card Body navigates to Set Summary */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Open study set: ${item.title}`}
                  activeOpacity={0.75}
                  onPress={() => {
                    void safeHaptics('light');
                    router.push(`/set/${item.id}`);
                  }}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <Chip label={item.subject} size="sm" variant="primary" />
                    <Text className="text-[11px] text-slate-400">
                      {item.cards.length} cards · {item.quizzes.length} quiz
                    </Text>
                  </View>

                  <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                    {item.title}
                  </Text>

                  <Text
                    className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2"
                    numberOfLines={2}
                  >
                    {item.summary}
                  </Text>
                </TouchableOpacity>

                <View className="flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    label="Flashcards"
                    size="sm"
                    variant="outline"
                    onPress={() => {
                      void safeHaptics('light');
                      router.push(`/set/${item.id}/flashcards`);
                    }}
                  />
                  <Button
                    label="Take Quiz"
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      void safeHaptics('light');
                      router.push(`/set/${item.id}/quiz`);
                    }}
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
