import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { useSetStore } from '../../../store';
import { Card } from '../../../components/Card';
import { Chip } from '../../../components/Chip';
import { Button } from '../../../components/Button';
import { EmptyState } from '../../../components/EmptyState';
import { PodcastPlayerModal } from '../../../components/PodcastPlayerModal';
import { MindMapModal } from '../../../components/MindMapModal';
import {
  formatStudyDate,
  formatBytes,
  speakText,
  stopSpeech,
  exportStudyDeck,
  exportPrintableCheatSheet,
  safeHaptics,
  safeAlert,
} from '../../../utils';

export default function SetSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const set = useSetStore((state) => state.getSet(id ?? ''));
  const setExamDate = useSetStore((state) => state.setExamDate);

  const [isReading, setIsReading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showDatePickerPresets, setShowDatePickerPresets] = useState(false);
  const [showPodcastModal, setShowPodcastModal] = useState(false);
  const [showMindMapModal, setShowMindMapModal] = useState(false);

  useEffect(() => {
    return () => {
      void stopSpeech();
    };
  }, []);

  const examMetrics = useMemo(() => {
    if (!set?.examDate) return null;
    try {
      const examDate = parseISO(set.examDate);
      const today = new Date();
      const daysLeft = differenceInCalendarDays(examDate, today);
      const cards = set.cards || [];
      const mastered = cards.filter((c) => c.box === 3).length;
      const unmastered = cards.length - mastered;
      const dailyQuota =
        daysLeft <= 0
          ? unmastered
          : Math.ceil(unmastered / Math.max(1, daysLeft));

      return {
        formattedDate: format(examDate, 'EEE, MMM d, yyyy'),
        daysLeft,
        mastered,
        unmastered,
        dailyQuota,
      };
    } catch {
      return null;
    }
  }, [set]);

  if (!set) {
    return (
      <View className="flex-1 p-6 items-center justify-center">
        <EmptyState
          emoji="❓"
          title="Study Set Not Found"
          description="This study set may have been deleted or the link is invalid."
          action={{
            label: 'Back to Library',
            onPress: () => router.replace('/(tabs)/library'),
          }}
        />
      </View>
    );
  }

  const handleToggleAudio = async () => {
    if (isReading) {
      await stopSpeech();
      setIsReading(false);
      void safeHaptics('light');
      return;
    }

    void safeHaptics('light');
    setIsReading(true);

    const fullSpeechText = `${set.title}. ${set.subject}. Overview summary: ${
      set.summary
    }. Key learning takeaways: ${set.keyPoints.join('. ')}`;

    await speakText(fullSpeechText, () => setIsReading(false));
  };

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    void safeHaptics('light');

    try {
      const res = await exportStudyDeck(set);
      if (!res.success && res.error) {
        safeAlert('Export Error', res.error);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    if (isPrinting) return;
    setIsPrinting(true);
    void safeHaptics('light');

    try {
      const res = await exportPrintableCheatSheet(set);
      if (!res.success && res.error) {
        safeAlert('Cheat Sheet Error', res.error);
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSetExamDays = (days: number | null) => {
    void safeHaptics('medium');
    if (days === null) {
      setExamDate(set.id, null);
      setShowDatePickerPresets(false);
      safeAlert('Exam Target Removed', 'The exam countdown has been removed for this study deck.');
      return;
    }

    const targetDate = addDays(new Date(), days);
    setExamDate(set.id, targetDate.toISOString());
    setShowDatePickerPresets(false);
    safeAlert(
      'Exam Target Scheduled! 🎯',
      `Target set for ${format(targetDate, 'MMM d, yyyy')} (${days} days from today). Your daily quota is ready.`
    );
  };

  const sourceTypeBadge = {
    text: { icon: '📝', label: 'Notes' },
    image: { icon: '📸', label: 'Photo Scan' },
    file: { icon: '📄', label: 'Document' },
  }[set.sourceType] ?? { icon: '📝', label: 'Notes' };

  return (
    <>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject, Source Badge and Header Actions */}
        <View className="flex-row justify-between items-center flex-wrap gap-2 mb-3">
          <View className="flex-row items-center gap-2">
            <Chip label={set.subject} variant="primary" size="sm" />
            <View className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 flex-row items-center gap-1">
              <Text className="text-[10px]">{sourceTypeBadge.icon}</Text>
              <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {sourceTypeBadge.label}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Print one-page revision cheat sheet"
              onPress={handlePrint}
              disabled={isPrinting}
              className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800"
            >
              <Text className="text-xs">🖨️</Text>
              <Text className="text-xs font-semibold text-primary-700 dark:text-primary-300">
                {isPrinting ? 'Printing...' : 'Cheat Sheet'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Export and share study deck"
              onPress={handleExport}
              disabled={isExporting}
              className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <Text className="text-xs">📤</Text>
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isExporting ? 'Exporting...' : 'Share'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
          {set.title}
        </Text>

        <Text className="text-xs text-slate-400 mb-4">
          Created {formatStudyDate(set.createdAt)} · {set.cards.length} Flashcards · {set.quizzes.length} Quizzes
        </Text>

        {/* Exam Countdown & Daily Quota Planner Card */}
        <Card className="p-4 mb-4 border-l-4 border-l-indigo-500">
          <View className="flex-row justify-between items-start mb-2">
            <View className="flex-row items-center gap-2">
              <Text className="text-lg">🎯</Text>
              <View>
                <Text className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  Exam Countdown & Daily Quota
                </Text>
                <Text className="text-[11px] text-slate-400">
                  {examMetrics
                    ? `Target: ${examMetrics.formattedDate}`
                    : 'Set a target date to calculate your daily revision pace'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Toggle exam target selector"
              onPress={() => setShowDatePickerPresets((prev) => !prev)}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
            >
              <Text className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
                {examMetrics ? 'Edit Target' : '+ Set Date'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Exam Status & Daily Quota Output */}
          {examMetrics && (
            <View className="mt-2 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <View className="flex-row justify-between items-center mb-2">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs">
                    {examMetrics.daysLeft > 1
                      ? '⏳'
                      : examMetrics.daysLeft === 1
                      ? '⚡'
                      : examMetrics.daysLeft === 0
                      ? '🏁'
                      : '📅'}
                  </Text>
                  <Text className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                    {examMetrics.daysLeft > 1
                      ? `${examMetrics.daysLeft} Days Remaining`
                      : examMetrics.daysLeft === 1
                      ? 'Exam is Tomorrow!'
                      : examMetrics.daysLeft === 0
                      ? 'Exam is Today! Good Luck!'
                      : `Exam Passed (${Math.abs(examMetrics.daysLeft)} days ago)`}
                  </Text>
                </View>

                <View className="bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
                  <Text className="text-[10px] font-extrabold text-indigo-800 dark:text-indigo-200">
                    Quota: {examMetrics.dailyQuota} cards/day
                  </Text>
                </View>
              </View>

              <Text className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {examMetrics.unmastered > 0
                  ? `Review at least ${examMetrics.dailyQuota} unmastered ${
                      examMetrics.dailyQuota === 1 ? 'card' : 'cards'
                    } each day to achieve 100% Leitner Box 3 mastery before your exam.`
                  : '🎉 All cards in this set are already mastered in Leitner Box 3! Keep doing refresher reviews.'}
              </Text>

              <View className="flex-row justify-between items-center mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <Text className="text-[10px] text-slate-400">
                  Mastery: {examMetrics.mastered}/{set.cards.length} cards in Box 3
                </Text>
                <TouchableOpacity
                  onPress={() => handleSetExamDays(null)}
                  className="active:opacity-70"
                >
                  <Text className="text-[10px] font-bold text-rose-500">
                    Clear Target
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Date presets selector drawer */}
          {showDatePickerPresets && (
            <View className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Text className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Select Exam Target:
              </Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => handleSetExamDays(3)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                >
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    ⚡ 3 Days (Sprint)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSetExamDays(7)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                >
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    📅 1 Week (7 Days)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSetExamDays(14)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                >
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    🗓️ 2 Weeks (14 Days)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleSetExamDays(30)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800"
                >
                  <Text className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    📆 1 Month (30 Days)
                  </Text>
                </TouchableOpacity>

                {examMetrics && (
                  <TouchableOpacity
                    onPress={() => handleSetExamDays(null)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800"
                  >
                    <Text className="text-xs font-bold text-rose-700 dark:text-rose-300">
                      ✕ Remove Target
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </Card>

        {/* AI Accelerators: Podcast & Concept Mind Map */}
        <View className="flex-row gap-2.5 mb-5">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Listen to AI Two-Voice Podcast"
            onPress={() => {
              void safeHaptics('light');
              setShowPodcastModal(true);
            }}
            className="flex-1 p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 active:opacity-75"
          >
            <View className="flex-row items-center gap-1.5 mb-1">
              <Text className="text-base">🎙️</Text>
              <Text className="text-xs font-black text-purple-900 dark:text-purple-100">
                AI Podcast
              </Text>
            </View>
            <Text className="text-[10px] text-purple-700/80 dark:text-purple-300">
              2-voice audio lecture
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Explore Concept Mind Map"
            onPress={() => {
              void safeHaptics('light');
              setShowMindMapModal(true);
            }}
            className="flex-1 p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 active:opacity-75"
          >
            <View className="flex-row items-center gap-1.5 mb-1">
              <Text className="text-base">🗺️</Text>
              <Text className="text-xs font-black text-teal-900 dark:text-teal-100">
                Mind Map
              </Text>
            </View>
            <Text className="text-[10px] text-teal-700/80 dark:text-teal-300">
              Visual concept tree
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photo Preview if set was created from photo */}
        {set.sourceType === 'image' && Boolean(set.imageUri) && (
          <Card className="p-3 mb-5 overflow-hidden">
            <View className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2 border border-slate-200 dark:border-slate-700">
              <Image
                source={{ uri: set.imageUri }}
                style={{ width: '100%', height: 180 }}
                contentFit="cover"
                transition={200}
              />
            </View>
            <Text className="text-[11px] text-slate-400 text-center font-medium">
              📸 Source Photo Note Attached
            </Text>
          </Card>
        )}

        {/* Document info if set was created from file */}
        {set.sourceType === 'file' && (
          <View className="flex-row items-center gap-3 bg-white dark:bg-surface-darkSubtle p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 mb-5">
            <View className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 items-center justify-center">
              <Text className="text-lg">📄</Text>
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-bold text-slate-800 dark:text-slate-200"
                numberOfLines={1}
              >
                {set.fileName ?? 'Attached Study Document'}
              </Text>
              {Boolean(set.fileSize) && (
                <Text className="text-[10px] text-slate-400">
                  {formatBytes(set.fileSize)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Summary Card with Audio Listen Button */}
        <Card className="p-5 mb-5">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-base">📋</Text>
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                AI Overview Summary
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isReading ? 'Stop audio playback' : 'Listen to overview audio'}
              onPress={handleToggleAudio}
              className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full border ${
                isReading
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-primary-50 dark:bg-primary-950/60 border-primary-200 dark:border-primary-800'
              }`}
            >
              <Text className="text-xs">{isReading ? '⏹️' : '🔊'}</Text>
              <Text
                className={`text-[11px] font-bold ${
                  isReading ? 'text-white' : 'text-primary-700 dark:text-primary-300'
                }`}
              >
                {isReading ? 'Stop' : 'Listen'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
            {set.summary}
          </Text>
        </Card>

        {/* Key Points */}
        <Card className="p-5 mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Text className="text-base">💡</Text>
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Key Learning Takeaways ({set.keyPoints.length})
            </Text>
          </View>

          <View className="gap-2.5">
            {set.keyPoints.map((point, index) => (
              <View key={index} className="flex-row items-start gap-2.5">
                <View className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-950/60 items-center justify-center mt-0.5">
                  <Text className="text-[11px] font-bold text-primary-700 dark:text-primary-300">
                    {index + 1}
                  </Text>
                </View>
                <Text className="text-xs text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
                  {point}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Study CTAs */}
        <View className="flex-row gap-3">
          <Button
            label="Practice Flashcards"
            className="flex-1"
            size="md"
            variant="secondary"
            onPress={() => router.replace(`/set/${set.id}/flashcards`)}
          />
          <Button
            label="Take Quiz"
            className="flex-1"
            size="md"
            variant="primary"
            onPress={() => router.replace(`/set/${set.id}/quiz`)}
          />
        </View>
      </ScrollView>

      {/* AI Accelerators Modals */}
      <PodcastPlayerModal
        set={set}
        visible={showPodcastModal}
        onClose={() => setShowPodcastModal(false)}
      />
      <MindMapModal
        set={set}
        visible={showMindMapModal}
        onClose={() => setShowMindMapModal(false)}
      />
    </>
  );
}
