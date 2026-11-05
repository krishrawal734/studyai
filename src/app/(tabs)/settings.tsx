import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Linking, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore, useSetStore, useStatsStore } from '../../store';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { AppTheme } from '../../types';
import {
  scheduleDailyStudyReminder,
  cancelDailyStudyReminder,
  sendInstantTestNotification,
  safeHaptics,
  safeAlert,
} from '../../utils';

const REMINDER_PRESETS = [
  { label: '08:00 AM', time: '08:00', period: 'Morning' },
  { label: '02:00 PM', time: '14:00', period: 'Afternoon' },
  { label: '06:00 PM', time: '18:00', period: 'Evening' },
  { label: '08:00 PM', time: '20:00', period: 'Night' },
  { label: '09:30 PM', time: '21:30', period: 'Late' },
];

export default function SettingsScreen() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const reminderTime = useSettingsStore((state) => state.reminderTime) ?? '20:00';
  const reminderEnabled = useSettingsStore((state) => state.reminderEnabled);
  const setReminder = useSettingsStore((state) => state.setReminder);
  const setOnboardingDone = useSettingsStore((state) => state.setOnboardingDone);

  const [isTestingNotification, setIsTestingNotification] = useState(false);

  const resetSets = useSetStore((state) => state.resetSets);
  const resetStats = useStatsStore((state) => state.resetStats);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const streakFreezes = useStatsStore((state) => state.streakFreezes);
  const freezesUsed = useStatsStore((state) => state.freezesUsed);
  const addStreakFreeze = useStatsStore((state) => state.addStreakFreeze);

  const handleClaimFreeze = () => {
    if (streakFreezes >= 5) {
      safeAlert(
        'Maximum Reached',
        'You already have 5 streak freezes banked! Use them when you need a study break.'
      );
      return;
    }
    addStreakFreeze();
    void safeHaptics('success');
    safeAlert(
      'Streak Freeze Claimed! 🛡️',
      'You now have an extra freeze to protect your study streak if you miss a day.'
    );
  };

  const handleToggleReminder = async () => {
    void safeHaptics('medium');
    const willEnable = !reminderEnabled;

    if (willEnable) {
      const [h, m] = reminderTime.split(':').map((v) => parseInt(v, 10));
      const res = await scheduleDailyStudyReminder(h || 20, m || 0);

      if (res.success) {
        setReminder(reminderTime, true);
        void safeHaptics('success');
        safeAlert(
          'Daily Reminder Scheduled',
          `StudyAI will remind you every day at ${reminderTime} to keep your streak going!`
        );
      } else {
        setReminder(reminderTime, false);
        safeAlert(
          'Permission Needed',
          res.error ?? 'Please allow notifications for StudyAI in your system settings.'
        );
      }
    } else {
      await cancelDailyStudyReminder();
      setReminder(reminderTime, false);
      void safeHaptics('light');
    }
  };

  const handleSelectTime = async (time: string) => {
    void safeHaptics('light');
    if (reminderEnabled) {
      const [h, m] = time.split(':').map((v) => parseInt(v, 10));
      const res = await scheduleDailyStudyReminder(h || 20, m || 0);
      if (res.success) {
        setReminder(time, true);
        void safeHaptics('success');
      } else {
        setReminder(time, false);
      }
    } else {
      setReminder(time, false);
    }
  };

  const handleSendTestNotification = async () => {
    void safeHaptics('medium');
    setIsTestingNotification(true);
    const res = await sendInstantTestNotification();
    setIsTestingNotification(false);

    if (res.success) {
      void safeHaptics('success');
      safeAlert('Notification Sent', 'A test notification has been dispatched to your notification bar.');
    } else {
      safeAlert('Notice', res.error ?? 'Unable to send test notification.');
    }
  };

  const handleResetAllData = () => {
    safeAlert(
      'Reset All Study Data?',
      'This will delete all saved study sets, flashcards, streak stats, and history. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await cancelDailyStudyReminder();
            resetSets();
            resetStats();
            resetSettings();
            void safeHaptics('warning');
            safeAlert('Reset Complete', 'All study sets and statistics have been reset.');
          },
        },
      ]
    );
  };

  const handleReplayOnboarding = () => {
    setOnboardingDone(false);
    router.replace('/onboarding');
  };

  const handleOpenLink = async (url: string) => {
    void safeHaptics('light');
    try {
      await Linking.openURL(url);
    } catch {
      safeAlert('Open Link', `Could not open ${url}`);
    }
  };

  const handleShareApp = async () => {
    void safeHaptics('light');
    try {
      await Share.share({
        title: 'StudyAI · AI Study Assistant',
        message:
          'StudyAI — Smart mobile study companion engineered by Krish Rawal for active recall, flashcards, and quizzes!',
      });
    } catch {
      // User dismissed
    }
  };

  const themes: { label: string; value: AppTheme; icon: string }[] = [
    { label: 'System', value: 'system', icon: '📱' },
    { label: 'Light', value: 'light', icon: '☀️' },
    { label: 'Dark', value: 'dark', icon: '🌙' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-surface-subtle dark:bg-surface-dark">
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
          Settings
        </Text>
        <Text className="text-xs text-slate-400 mb-6">
          Preferences, theme, notifications, and local storage
        </Text>

        {/* Theme Section */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 ml-1">
          Appearance
        </Text>
        <Card className="p-3.5 mb-6">
          <View className="flex-row gap-2">
            {themes.map((item) => {
              const isSelected = theme === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} theme`}
                  onPress={() => {
                    void safeHaptics('light');
                    setTheme(item.value);
                  }}
                  className={`flex-1 py-3 items-center rounded-xl border ${
                    isSelected
                      ? 'bg-primary-50 dark:bg-primary-950/50 border-primary-500'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Text className="text-xl mb-1">{item.icon}</Text>
                  <Text
                    className={`text-xs font-bold ${
                      isSelected
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Daily Study Notification */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 ml-1">
          Daily Study Notification
        </Text>
        <Card className="p-4 mb-6">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-4">
              <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Daily Study Reminder
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                Keep your streak alive with a scheduled local push notification
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="switch"
              accessibilityLabel="Toggle daily study reminder"
              accessibilityState={{ checked: reminderEnabled }}
              onPress={() => {
                void handleToggleReminder();
              }}
              className={`w-12 h-7 rounded-full p-0.5 ${
                reminderEnabled ? 'bg-primary-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <View
                className={`w-6 h-6 rounded-full bg-white shadow-sm ${
                  reminderEnabled ? 'ml-auto' : 'ml-0'
                }`}
              />
            </TouchableOpacity>
          </View>

          {/* Time Picker Presets */}
          <View className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              Scheduled Time: <Text className="text-primary-600 font-extrabold">{reminderTime}</Text>
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {REMINDER_PRESETS.map((preset) => {
                const isSelected = reminderTime === preset.time;
                return (
                  <TouchableOpacity
                    key={preset.time}
                    onPress={() => {
                      void handleSelectTime(preset.time);
                    }}
                    className={`px-3 py-1.5 rounded-xl border ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Test Reminder Trigger */}
          <View className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Instant Test Trigger
              </Text>
              <Text className="text-[11px] text-slate-400">
                Send a notification now to verify device delivery
              </Text>
            </View>
            <Button
              label={isTestingNotification ? 'Sending...' : 'Test Now'}
              size="sm"
              variant="outline"
              disabled={isTestingNotification}
              onPress={() => {
                void handleSendTestNotification();
              }}
            />
          </View>
        </Card>

        {/* Streak Shield & Habit Protection */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 ml-1">
          Streak Shield & Habit Protection
        </Text>
        <Card className="p-4 mb-6">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Text className="text-base">🛡️</Text>
                <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {streakFreezes} {streakFreezes === 1 ? 'Freeze' : 'Freezes'} Available
                </Text>
              </View>
              <Text className="text-xs text-slate-400">
                {freezesUsed > 0
                  ? `${freezesUsed} used in the past · Auto-shields your streak if you miss a day.`
                  : 'Auto-shields your streak if you ever miss a study day.'}
              </Text>
            </View>
            <Button
              label="+ Bank Freeze"
              size="sm"
              variant="outline"
              onPress={handleClaimFreeze}
            />
          </View>
        </Card>

        {/* Help & Walkthrough */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 ml-1">
          Guide & Walkthrough
        </Text>
        <Card className="p-4 mb-6">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Replay Onboarding
              </Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                Review features, spaced repetition tips, and AI capabilities
              </Text>
            </View>
            <Button
              label="Replay"
              size="sm"
              variant="outline"
              onPress={handleReplayOnboarding}
            />
          </View>
        </Card>

        {/* Data & Storage */}
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5 ml-1">
          Storage & Privacy
        </Text>
        <Card className="p-4 mb-6">
          <Text className="text-xs text-slate-500 leading-relaxed mb-4">
            StudyAI stores all your notes, flashcards, and history purely on your local
            device. No server accounts, external trackers, or telemetry.
          </Text>
          <Button
            label="Reset All App Data"
            variant="danger"
            size="sm"
            onPress={handleResetAllData}
          />
        </Card>

        {/* About App Section */}
        <View className="flex-row justify-between items-center mb-2.5 ml-1 mr-1">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            About Application
          </Text>
          <View className="bg-primary-50 dark:bg-primary-950/60 px-2.5 py-0.5 rounded-full border border-primary-200/60 dark:border-primary-800/60">
            <Text className="text-[10px] font-bold text-primary-700 dark:text-primary-300">
              v1.0.0 · Production Ready
            </Text>
          </View>
        </View>

        <Card className="p-4 mb-6 border border-slate-200/80 dark:border-slate-800">
          {/* Header Title with Developer Byline */}
          <View className="flex-row items-center gap-3.5 mb-3">
            <View className="w-13 h-13 rounded-2xl bg-primary-100 dark:bg-primary-950/60 items-center justify-center p-2.5">
              <Text className="text-2xl">🧠</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-lg font-black text-slate-900 dark:text-slate-100">
                  StudyAI
                </Text>
                <View className="bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Student Edition
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-primary-600 dark:text-primary-400 font-bold mt-0.5">
                Engineered & Designed by Krish Rawal
              </Text>
            </View>
          </View>

          {/* Value Proposition Description */}
          <Text className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3.5">
            An intelligent mobile study assistant designed to maximize active recall and long-term retention.
            Effortlessly converts lecture notes, textbook photos, and documents into high-yield summaries,
            3-box Leitner flashcards, and adaptive practice quizzes.
          </Text>

          {/* Feature Highlights Pills (Option B) */}
          <View className="flex-row flex-wrap gap-1.5 mb-4">
            <View className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
              <Text className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                🔒 100% Offline & Private
              </Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
              <Text className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                ⚡ Zero-Latency Local AI
              </Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
              <Text className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                🎯 3-Box Leitner Spaced Repetition
              </Text>
            </View>
            <View className="bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
              <Text className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                📱 iOS, Android & Web
              </Text>
            </View>
          </View>

          {/* Interactive Developer Profile & Action Pills (Option A) */}
          <View className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 mb-4">
            <View className="flex-row justify-between items-center mb-2.5">
              <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Developer Profile
              </Text>
              <View className="flex-row items-center gap-1 bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-full border border-primary-200/60 dark:border-primary-800/60">
                <Text className="text-[11px] font-black text-primary-700 dark:text-primary-300">
                  Krish Rawal
                </Text>
                <Text className="text-primary-600 dark:text-primary-400 text-[11px] font-bold">✓</Text>
              </View>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => void handleOpenLink('https://github.com/krishrawal734')}
                className="flex-1 py-2 px-2.5 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700 items-center justify-center flex-row gap-1.5 active:opacity-70 shadow-sm"
              >
                <Text className="text-xs">🐙</Text>
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  GitHub
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleOpenLink('https://www.linkedin.com/in/krish-rawal-8ab87339b/6')}
                className="flex-1 py-2 px-2.5 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700 items-center justify-center flex-row gap-1.5 active:opacity-70 shadow-sm"
              >
                <Text className="text-xs">💼</Text>
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  LinkedIn
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleShareApp()}
                className="flex-1 py-2 px-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 items-center justify-center flex-row gap-1.5 active:opacity-70"
              >
                <Text className="text-xs">📤</Text>
                <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
                  Share App
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Technical Architecture Specs with Visual Icons */}
          <View className="gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <View className="flex-row justify-between items-center py-0.5">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs">👨‍💻</Text>
                <Text className="text-[11px] text-slate-400 font-medium">Lead Developer</Text>
              </View>
              <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Krish Rawal
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs">⚡</Text>
                <Text className="text-[11px] text-slate-400 font-medium">Architecture</Text>
              </View>
              <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Swappable AIService (Mock / Cloud)
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-xs">🛡️</Text>
                <Text className="text-[11px] text-slate-400 font-medium">Validation</Text>
              </View>
              <Text className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Zod Runtime Schema Contracts
              </Text>
            </View>

            
          </View>
        </Card>

        {/* Polished Footer */}
        <View className="items-center py-4 mb-4">
          <View className="flex-row items-center gap-1.5 mb-1">
            <Text className="text-xs text-slate-400">Crafted with</Text>
            <Text className="text-rose-500 text-xs">❤️</Text>
            <Text className="text-xs font-black text-slate-800 dark:text-slate-200">
              by Krish Rawal
            </Text>
          </View>
          <Text className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
            StudyAI · Built for Student Success
          </Text>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
