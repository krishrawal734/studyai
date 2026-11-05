import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withRepeat,
} from 'react-native-reanimated';
import { subDays, format, isSameDay } from 'date-fns';
import { StudyHistoryEntry } from '../types';
import { safeHaptics } from '../utils';

export interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  history?: StudyHistoryEntry[];
  streakJustGrew?: boolean;
  streakFreezes?: number;
  streakProtectedByFreeze?: boolean;
  onClearStreakGrew?: () => void;
  className?: string;
}

export const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  history = [],
  streakJustGrew = false,
  streakFreezes = 2,
  streakProtectedByFreeze = false,
  onClearStreakGrew,
  className = '',
}) => {
  // Reanimated shared values for animations
  const flameScale = useSharedValue(1);
  const flameRotate = useSharedValue(0);
  const countScale = useSharedValue(1);
  const celebrationOpacity = useSharedValue(streakJustGrew ? 1 : 0);

  useEffect(() => {
    if (streakJustGrew) {
      void safeHaptics('success');

      // Trigger celebratory spring bounce & wiggle
      flameScale.value = withSequence(
        withSpring(1.4, { damping: 4, stiffness: 220 }),
        withSpring(1.0, { damping: 8 })
      );
      flameRotate.value = withSequence(
        withTiming(-12, { duration: 120 }),
        withTiming(12, { duration: 120 }),
        withTiming(-8, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
      countScale.value = withSequence(
        withSpring(1.3, { damping: 4, stiffness: 200 }),
        withSpring(1.0)
      );

      celebrationOpacity.value = withTiming(1, { duration: 300 });

      const timer = setTimeout(() => {
        celebrationOpacity.value = withTiming(0, { duration: 400 });
        onClearStreakGrew?.();
      }, 4500);

      return () => clearTimeout(timer);
    } else if (currentStreak > 0) {
      // Subtle gentle breathing animation for active streak
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200 }),
          withTiming(1.0, { duration: 1200 })
        ),
        -1,
        true
      );
    } else {
      flameScale.value = 1;
      flameRotate.value = 0;
    }
  }, [currentStreak, streakJustGrew, flameScale, flameRotate, countScale, celebrationOpacity, onClearStreakGrew]);

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotate.value}deg` },
    ],
  }));

  const animatedCountStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countScale.value }],
  }));

  const animatedCelebrationStyle = useAnimatedStyle(() => ({
    opacity: celebrationOpacity.value,
  }));

  // Generate the last 7 days ending on today
  const today = new Date();
  const pastSevenDays = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayName = format(date, 'EEE').slice(0, 2); // Mo, Tu, We, etc.
    const isToday = isSameDay(date, today);
    const hasStudied = history.some((h) => h.date === dateStr);

    return {
      dateStr,
      dayName,
      isToday,
      hasStudied,
    };
  });

  const studiedToday = pastSevenDays[pastSevenDays.length - 1]?.hasStudied;

  // Milestone calculation
  const getNextMilestone = (streak: number) => {
    if (streak < 3) return { target: 3, label: '3 Days', badge: '🥉 Pioneer' };
    if (streak < 7) return { target: 7, label: '7 Days', badge: '🥈 Champion' };
    if (streak < 14) return { target: 14, label: '14 Days', badge: '🥇 Scholar' };
    if (streak < 30) return { target: 30, label: '30 Days', badge: '🏆 Master' };
    return { target: 100, label: '100 Days', badge: '👑 Legend' };
  };

  const milestone = getNextMilestone(currentStreak);
  const milestoneProgress = Math.min(
    100,
    Math.round((currentStreak / milestone.target) * 100)
  );

  const getMotivation = (streak: number) => {
    if (streak === 0) return 'Start a study session today to ignite your streak!';
    if (studiedToday) return '🎉 Today is completed! Your streak is safely locked in.';
    if (streak === 1) return 'Great job starting your streak! Complete a session today to reach day 2.';
    if (streak < 5) return 'You are building serious momentum! Keep it going today.';
    if (streak < 14) return 'Outstanding dedication! You are on an unstoppable roll!';
    return 'Legendary consistency! True mastery in progress!';
  };

  return (
    <View
      className={`bg-white dark:bg-surface-darkSubtle rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm ${className}`}
    >
      {/* Celebration Banner when streak just increased */}
      {Boolean(streakJustGrew) && (
        <Animated.View
          style={animatedCelebrationStyle}
          className="mb-3 bg-amber-500 rounded-2xl py-2 px-3.5 flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🎉</Text>
            <Text className="text-xs font-bold text-white">
              Streak grew to {currentStreak} {currentStreak === 1 ? 'day' : 'days'}!
            </Text>
          </View>
          <Text className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
            +1 Streak
          </Text>
        </Animated.View>
      )}

      {/* Streak Protected Banner if freeze was activated */}
      {Boolean(streakProtectedByFreeze) && (
        <View className="mb-3 bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200 dark:border-cyan-800 rounded-2xl py-2 px-3.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-base">🛡️</Text>
            <Text className="text-xs font-bold text-cyan-800 dark:text-cyan-200">
              Streak Saved by Freeze!
            </Text>
          </View>
          <Text className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-300">
            Auto-Shielded
          </Text>
        </View>
      )}

      {/* Main Header */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center gap-3">
          <Animated.View
            style={animatedFlameStyle}
            className={`w-13 h-13 rounded-2xl items-center justify-center border ${
              currentStreak > 0
                ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            }`}
          >
            <Text className="text-2xl">{currentStreak > 0 ? '🔥' : '❄️'}</Text>
          </Animated.View>

          <View>
            <View className="flex-row items-baseline gap-1.5">
              <Animated.Text
                style={animatedCountStyle}
                className="text-3xl font-black text-slate-900 dark:text-slate-100"
              >
                {currentStreak}
              </Animated.Text>
              <Text className="text-sm font-bold text-amber-500 uppercase tracking-wider">
                {currentStreak === 1 ? 'day streak' : 'days streak'}
              </Text>
            </View>
            <Text className="text-xs text-slate-400 mt-0.5">
              Personal best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        <View
          className={`px-3 py-1.5 rounded-full border ${
            studiedToday
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : currentStreak > 0
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Text
            className={`text-[11px] font-bold ${
              studiedToday
                ? 'text-emerald-700 dark:text-emerald-400'
                : currentStreak > 0
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {studiedToday ? '✓ Done Today' : currentStreak > 0 ? 'Due Today' : 'Ready'}
          </Text>
        </View>
      </View>

      {/* Motivational Subtitle */}
      <Text className="text-xs text-slate-600 dark:text-slate-300 font-medium mb-3.5">
        {getMotivation(currentStreak)}
      </Text>

      {/* Next Milestone Bar */}
      <View className="mb-3 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
        <View className="flex-row justify-between items-center mb-1.5">
          <Text className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
            Next Milestone: {milestone.badge}
          </Text>
          <Text className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
            {currentStreak}/{milestone.target} days
          </Text>
        </View>
        <View className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <View
            style={{ width: `${milestoneProgress}%` }}
            className="h-full bg-amber-500 rounded-full"
          />
        </View>
      </View>

      {/* Streak Protection Shield Info */}
      <View className="flex-row items-center justify-between mb-3 px-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="text-xs">🛡️</Text>
          <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            Streak Shield:
          </Text>
          <Text className="text-[11px] font-bold text-cyan-700 dark:text-cyan-300">
            {streakFreezes} {streakFreezes === 1 ? 'Freeze' : 'Freezes'} Available
          </Text>
        </View>
        <Text className="text-[10px] text-slate-400">
          Auto-saves missed day
        </Text>
      </View>

      {/* 7-Day Activity Row */}
      <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
        {pastSevenDays.map((day) => (
          <View key={day.dateStr} className="items-center gap-1.5 flex-1">
            <Text
              className={`text-[10px] font-bold uppercase ${
                day.isToday
                  ? 'text-amber-600 dark:text-amber-400 font-black'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {day.dayName}
            </Text>

            <View
              className={`w-7 h-7 rounded-full items-center justify-center border ${
                day.hasStudied
                  ? 'bg-amber-500 border-amber-500'
                  : day.isToday
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 border-dashed'
                  : 'bg-slate-200 dark:bg-slate-800 border-transparent'
              }`}
            >
              {day.hasStudied ? (
                <Text className="text-xs text-white font-black">✓</Text>
              ) : day.isToday ? (
                <View className="w-2 h-2 rounded-full bg-amber-500" />
              ) : (
                <View className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
              )}
            </View>

            {Boolean(day.isToday) && (
              <Text className="text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                Today
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};
