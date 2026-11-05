import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { subDays, format, isSameDay, parseISO } from 'date-fns';
import { useSetStore, useStatsStore, calculateLevel } from '../../store';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { safeAlert, safeHaptics, calculateNextReviewDate } from '../../utils';
import { aiService } from '../../services/ai';
import { LeitnerBox } from '../../types';

const LEVEL_TITLES: Record<number, string> = {
  1: 'Novice Scholar',
  2: 'Curious Learner',
  3: 'Focused Apprentice',
  4: 'Knowledge Seeker',
  5: 'Dedicated Student',
  6: 'Academic Specialist',
  7: 'Retention Expert',
  8: 'Memory Master',
  9: 'Grand Scholar',
  10: 'StudyAI Luminary',
};

export default function ProgressScreen() {
  const sets = useSetStore((state) => state.sets);
  const addSet = useSetStore((state) => state.addSet);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const currentStreak = useStatsStore((state) => state.currentStreak);
  const longestStreak = useStatsStore((state) => state.longestStreak);
  const history = useStatsStore((state) => state.history);
  const xp = useStatsStore((state) => state.xp);
  const level = useStatsStore((state) => state.level);
  const badges = useStatsStore((state) => state.badges);

  const levelInfo = useMemo(() => {
    return calculateLevel(xp);
  }, [xp]);

  const unlockedBadgesCount = useMemo(() => {
    return (badges || []).filter((b) => b.unlockedAt !== null).length;
  }, [badges]);

  const rankTitle = LEVEL_TITLES[level] ?? 'Elite Scholar';

  // Card stats across all sets
  const totalCards = (sets || []).reduce((acc, s) => acc + (s.cards ? s.cards.length : 0), 0);
  const box1Cards = (sets || []).reduce(
    (acc, s) => acc + (s.cards ? s.cards.filter((c) => c.box === 1).length : 0),
    0
  );
  const box2Cards = (sets || []).reduce(
    (acc, s) => acc + (s.cards ? s.cards.filter((c) => c.box === 2).length : 0),
    0
  );
  const box3Cards = (sets || []).reduce(
    (acc, s) => acc + (s.cards ? s.cards.filter((c) => c.box === 3).length : 0),
    0
  );

  const box1Pct = totalCards > 0 ? Math.round((box1Cards / totalCards) * 100) : 0;
  const box2Pct = totalCards > 0 ? Math.round((box2Cards / totalCards) * 100) : 0;
  const box3Pct = totalCards > 0 ? Math.round((box3Cards / totalCards) * 100) : 0;

  const handleGenerateRemediationDrill = async () => {
    if (isDiagnosing || box1Cards === 0) return;
    setIsDiagnosing(true);
    void safeHaptics('medium');

    try {
      const strugglingCards = sets.flatMap((s) => s.cards.filter((c) => c.box === 1));
      const diagnosis = await aiService.generateWeakSpotRemediation(strugglingCards);
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

  // Cumulative study metrics
  const totalLifetimeCardsStudied = (history || []).reduce((acc, h) => acc + (h.cardsStudied || 0), 0);
  const totalLifetimeMinutes = (history || []).reduce((acc, h) => acc + (h.minutesStudied || 0), 0);

  // Quiz accuracy stats
  const allQuizScores: number[] = useMemo(() => {
    const scores: number[] = [];
    (sets || []).forEach((s) => {
      (s.quizzes || []).forEach((q) => {
        if (q.lastScore !== null && typeof q.lastScore === 'number') {
          scores.push(q.lastScore);
        }
      });
    });
    // Also add any recorded in history that might have been logged
    (history || []).forEach((h) => {
      (h.quizScores || []).forEach((score) => {
        if (!scores.includes(score)) {
          scores.push(score);
        }
      });
    });
    return scores;
  }, [sets, history]);

  const avgQuizScore = useMemo(() => {
    if (allQuizScores.length === 0) return null;
    return Math.round(allQuizScores.reduce((a, b) => a + b, 0) / allQuizScores.length);
  }, [allQuizScores]);

  const bestQuizScore = useMemo(() => {
    if (allQuizScores.length === 0) return null;
    return Math.max(...allQuizScores);
  }, [allQuizScores]);

  // 7-day activity bar chart data
  const { last7DaysData, maxCardsInWeek, totalCardsThisWeek } = useMemo(() => {
    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEE'); // Mon, Tue...
      const isToday = isSameDay(date, today);

      const entry = history.find((h) => h.date === dateStr);
      const cards = entry?.cardsStudied ?? 0;
      const minutes = entry?.minutesStudied ?? 0;

      return {
        dateStr,
        dayName,
        isToday,
        cards,
        minutes,
      };
    });

    const maxCards = Math.max(...days.map((d) => d.cards), 5);
    const sumWeek = days.reduce((acc, d) => acc + d.cards, 0);

    return {
      last7DaysData: days,
      maxCardsInWeek: maxCards,
      totalCardsThisWeek: sumWeek,
    };
  }, [history]);

  // Recent quiz attempts for trend visualization
  const recentQuizTrend = useMemo(() => {
    return allQuizScores.slice(-6);
  }, [allQuizScores]);

  return (
    <SafeAreaView className="flex-1 bg-surface-subtle dark:bg-surface-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
          Study Progress
        </Text>
        <Text className="text-xs text-slate-400 mb-4">
          Performance metrics, spaced repetition retention, and study logs
        </Text>

        {/* Student Level & XP Progress Card */}
        <Card className="p-4 mb-4 border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center gap-2.5">
              <View className="w-11 h-11 rounded-2xl bg-amber-500 items-center justify-center shadow-sm">
                <Text className="text-xl">⚡</Text>
              </View>
              <View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-base font-black text-slate-900 dark:text-slate-100">
                    Level {level}
                  </Text>
                  <View className="bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-full">
                    <Text className="text-[10px] font-black text-amber-800 dark:text-amber-200 uppercase tracking-wider">
                      {rankTitle}
                    </Text>
                  </View>
                </View>
                <Text className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {xp} Lifetime XP Earned
                </Text>
              </View>
            </View>

            <View className="items-end">
              <Text className="text-xs font-black text-amber-600 dark:text-amber-400">
                {levelInfo.currentXP} / {levelInfo.maxXP} XP
              </Text>
              <Text className="text-[10px] text-slate-400">
                {levelInfo.maxXP - levelInfo.currentXP} XP to Level {level + 1}
              </Text>
            </View>
          </View>

          <ProgressBar
            progress={Math.round(levelInfo.progress * 100)}
            color="streak"
            height={8}
            className="mt-1"
          />
        </Card>

        {/* Top Metric Grid */}
        <View className="flex-row gap-3 mb-3">
          <Card className="flex-1 p-3.5">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Streak
            </Text>
            <View className="flex-row items-baseline gap-1 mt-1">
              <Text className="text-2xl font-black text-amber-500">
                {currentStreak}
              </Text>
              <Text className="text-xs text-slate-400">days</Text>
            </View>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              Best: {longestStreak} days
            </Text>
          </Card>

          <Card className="flex-1 p-3.5">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Accuracy
            </Text>
            <View className="flex-row items-baseline gap-1 mt-1">
              <Text className="text-2xl font-black text-emerald-500">
                {avgQuizScore !== null ? `${avgQuizScore}%` : '—'}
              </Text>
            </View>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              {allQuizScores.length} attempts
            </Text>
          </Card>

          <Card className="flex-1 p-3.5">
            <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Time Spent
            </Text>
            <View className="flex-row items-baseline gap-1 mt-1">
              <Text className="text-2xl font-black text-indigo-500">
                {totalLifetimeMinutes}
              </Text>
              <Text className="text-xs text-slate-400">mins</Text>
            </View>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              {totalLifetimeCardsStudied} cards total
            </Text>
          </Card>
        </View>

        {/* 7-Day Activity Bar Chart */}
        <Card className="p-5 mb-6">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Cards Studied This Week
            </Text>
            <Text className="text-xs font-extrabold text-primary-600">
              {totalCardsThisWeek} cards
            </Text>
          </View>
          <Text className="text-[11px] text-slate-400 mb-6">
            Daily card reviews over the last 7 calendar days
          </Text>

          {/* Bar Chart Container */}
          <View className="h-36 flex-row items-end justify-between px-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            {last7DaysData.map((d) => {
              const heightPct = Math.max(
                8,
                Math.round((d.cards / maxCardsInWeek) * 100)
              );
              return (
                <View key={d.dateStr} className="items-center flex-1 h-full justify-end">
                  {/* Card count label */}
                  {d.cards > 0 && (
                    <Text className="text-[10px] font-black text-slate-600 dark:text-slate-300 mb-1">
                      {d.cards}
                    </Text>
                  )}

                  {/* Bar */}
                  <View
                    style={{ height: `${heightPct}%` }}
                    className={`w-7 rounded-t-lg transition-all ${
                      d.cards > 0
                        ? d.isToday
                          ? 'bg-amber-500'
                          : 'bg-primary-500 dark:bg-primary-600'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  />
                </View>
              );
            })}
          </View>

          {/* Day Labels Row */}
          <View className="flex-row justify-between px-2 pt-2">
            {last7DaysData.map((d) => (
              <View key={d.dateStr} className="items-center flex-1">
                <Text
                  className={`text-[11px] font-bold uppercase ${
                    d.isToday
                      ? 'text-amber-600 dark:text-amber-400 font-black'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {d.dayName}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Leitner Spaced Repetition Mastery Breakdown */}
        <Card className="p-5 mb-6">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Spaced Repetition Mastery
            </Text>
            <Text className="text-sm font-black text-primary-600">
              {box3Pct}% Mastered
            </Text>
          </View>
          <Text className="text-[11px] text-slate-400 mb-4">
            3-Box Leitner system distribution across all study decks
          </Text>

          {/* Segmented Distribution Bar */}
          <View className="w-full h-3 rounded-full overflow-hidden flex-row bg-slate-100 dark:bg-slate-800 mb-4">
            {box1Pct > 0 && (
              <View style={{ width: `${box1Pct}%` }} className="h-full bg-rose-500" />
            )}
            {box2Pct > 0 && (
              <View style={{ width: `${box2Pct}%` }} className="h-full bg-amber-500" />
            )}
            {box3Pct > 0 && (
              <View style={{ width: `${box3Pct}%` }} className="h-full bg-emerald-500" />
            )}
          </View>

          {/* Detailed Box Breakdown */}
          <View className="gap-2.5">
            {/* Box 1 */}
            <View className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-2xl border border-rose-100 dark:border-rose-900">
              <View className="flex-row justify-between items-center mb-1">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <Text className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    Box 1 (Daily Review)
                  </Text>
                </View>
                <Text className="text-xs font-extrabold text-rose-700 dark:text-rose-300">
                  {box1Cards} cards · {box1Pct}%
                </Text>
              </View>
              <Text className="text-[11px] text-rose-600/80 dark:text-rose-400">
                New or difficult concepts reviewed daily until remembered.
              </Text>
              {box1Cards > 0 && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Generate AI weak-spot remediation drill deck"
                  disabled={isDiagnosing}
                  onPress={handleGenerateRemediationDrill}
                  className="mt-2.5 py-2 px-3 rounded-xl bg-rose-100 dark:bg-rose-900/60 border border-rose-300 dark:border-rose-800 flex-row items-center justify-center gap-1.5 active:opacity-75"
                >
                  <Text className="text-xs">🔬</Text>
                  <Text className="text-xs font-bold text-rose-800 dark:text-rose-200">
                    {isDiagnosing ? 'Analyzing Weak Spots...' : 'Generate AI Remediation Drill Deck'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Box 2 */}
            <View className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-100 dark:border-amber-900">
              <View className="flex-row justify-between items-center mb-1">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <Text className="text-xs font-bold text-amber-800 dark:text-amber-300">
                    Box 2 (Every 3 Days)
                  </Text>
                </View>
                <Text className="text-xs font-extrabold text-amber-700 dark:text-amber-300">
                  {box2Cards} cards · {box2Pct}%
                </Text>
              </View>
              <Text className="text-[11px] text-amber-600/80 dark:text-amber-400">
                Concepts transitioning into intermediate memory.
              </Text>
            </View>

            {/* Box 3 */}
            <View className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900">
              <View className="flex-row justify-between items-center mb-1">
                <View className="flex-row items-center gap-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    Box 3 (Mastered · 7 Days)
                  </Text>
                </View>
                <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                  {box3Cards} cards · {box3Pct}%
                </Text>
              </View>
              <Text className="text-[11px] text-emerald-600/80 dark:text-emerald-400">
                Solidified into long-term retention. Reviewed weekly.
              </Text>
            </View>
          </View>
        </Card>

        {/* Quiz Accuracy Over Time */}
        <Card className="p-5 mb-6">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Quiz Accuracy Trend
            </Text>
            {avgQuizScore !== null && (
              <View className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                <Text className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400">
                  Avg: {avgQuizScore}%
                </Text>
              </View>
            )}
          </View>
          <Text className="text-[11px] text-slate-400 mb-4">
            Scores across multiple-choice quiz evaluations
          </Text>

          {recentQuizTrend.length === 0 ? (
            <View className="py-6 items-center justify-center">
              <Text className="text-2xl mb-1">📝</Text>
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">
                No quiz attempts recorded yet
              </Text>
              <Text className="text-[11px] text-slate-400 text-center mt-1">
                Take a quiz on any study set to track your retention scores over time.
              </Text>
            </View>
          ) : (
            <View>
              {/* Mini trend visualization of recent quizzes */}
              <View className="flex-row items-end justify-between h-24 px-3 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                {recentQuizTrend.map((score, idx) => (
                  <View key={idx} className="items-center flex-1 h-full justify-end">
                    <Text className="text-[10px] font-bold text-slate-500 mb-1">
                      {score}%
                    </Text>
                    <View
                      style={{ height: `${Math.max(10, score)}%` }}
                      className={`w-6 rounded-t-md ${
                        score >= 80
                          ? 'bg-emerald-500'
                          : score >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <Text className="text-[9px] text-slate-400 mt-1">
                      Q{idx + 1}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between items-center pt-2">
                <Text className="text-xs text-slate-400">
                  Highest score: <Text className="font-bold text-emerald-600">{bestQuizScore}%</Text>
                </Text>
                <Text className="text-xs text-slate-400">
                  Total completed: <Text className="font-bold text-slate-700 dark:text-slate-300">{allQuizScores.length}</Text>
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Achievement Badges Showcase */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-bold text-slate-900 dark:text-slate-100">
              Achievement Badges
            </Text>
            <View className="bg-amber-100 dark:bg-amber-900/50 px-2.5 py-0.5 rounded-full">
              <Text className="text-xs font-black text-amber-800 dark:text-amber-300">
                {unlockedBadgesCount} / {badges.length} Unlocked
              </Text>
            </View>
          </View>
          <Text className="text-[11px] text-slate-400 mb-3">
            Earn experience and unlock milestones as your study habits grow
          </Text>

          <View className="flex-row flex-wrap justify-between gap-y-2.5">
            {badges.map((badge) => {
              const isUnlocked = badge.unlockedAt !== null;
              return (
                <TouchableOpacity
                  key={badge.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${badge.title} badge. ${isUnlocked ? 'Unlocked' : 'Locked'}`}
                  onPress={() => {
                    void safeHaptics('light');
                    safeAlert(
                      `${badge.emoji} ${badge.title}`,
                      `${badge.description}\n\nStatus: ${
                        isUnlocked
                          ? `Unlocked on ${format(parseISO(badge.unlockedAt!), 'MMM d, yyyy')}`
                          : 'Locked · Complete study activities to unlock'
                      }`
                    );
                  }}
                  activeOpacity={0.75}
                  style={{ width: '48.5%' }}
                  className={`p-3 rounded-2xl border ${
                    isUnlocked
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/80'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
                  }`}
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View
                      className={`w-9 h-9 rounded-xl items-center justify-center ${
                        isUnlocked
                          ? 'bg-amber-100 dark:bg-amber-900/60'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <Text className="text-lg">{badge.emoji}</Text>
                    </View>

                    {isUnlocked ? (
                      <View className="bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md">
                        <Text className="text-[9px] font-black text-emerald-700 dark:text-emerald-400">
                          UNLOCKED
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-xs">🔒</Text>
                    )}
                  </View>

                  <Text
                    className={`text-xs font-black mb-0.5 ${
                      isUnlocked
                        ? 'text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                    numberOfLines={1}
                  >
                    {badge.title}
                  </Text>

                  <Text
                    className="text-[10px] text-slate-400 leading-tight"
                    numberOfLines={2}
                  >
                    {badge.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Study History Session Log */}
        <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">
          Session Log
        </Text>
        {history.length === 0 ? (
          <Card className="p-6 items-center justify-center">
            <Text className="text-2xl mb-1">📚</Text>
            <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">
              No study sessions yet
            </Text>
            <Text className="text-[11px] text-slate-400 text-center mt-0.5">
              Practice flashcards or create study sets to record your daily sessions.
            </Text>
          </Card>
        ) : (
          <View className="gap-2.5">
            {history.slice(0, 10).map((entry) => (
              <Card key={entry.date} className="p-3.5 flex-row justify-between items-center">
                <View>
                  <Text className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                    {entry.date}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">
                    ⏱ {entry.minutesStudied} min · 🃏 {entry.cardsStudied} cards studied
                  </Text>
                </View>

                {entry.quizScores.length > 0 && (
                  <View className="bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Text className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      Quiz: {entry.quizScores[entry.quizScores.length - 1]}%
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
