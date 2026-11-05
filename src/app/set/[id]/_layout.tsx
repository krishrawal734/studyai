import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Slot, useLocalSearchParams, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSetStore } from '../../../store';
import { safeHaptics } from '../../../utils';

export default function SetLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const set = useSetStore((state) => state.getSet(id ?? ''));

  const isFlashcardsActive = pathname.includes('/flashcards');
  const isQuizActive = pathname.includes('/quiz');
  const isSummaryActive = !isFlashcardsActive && !isQuizActive;

  const handleBack = () => {
    void safeHaptics('light');
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/library');
      }
    } catch {
      router.replace('/(tabs)/library');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-subtle dark:bg-surface-dark" edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-darkSubtle flex-row items-center justify-between">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to library"
          onPress={handleBack}
          className="py-1 px-2.5 -ml-2 rounded-xl flex-row items-center gap-1 active:opacity-70"
        >
          <Text className="text-base text-primary-600 font-bold">←</Text>
          <Text className="text-sm font-semibold text-primary-600">Back</Text>
        </TouchableOpacity>

        <View className="flex-1 items-center px-2">
          <Text
            className="text-sm font-bold text-slate-800 dark:text-slate-100"
            numberOfLines={1}
          >
            {set?.title ?? 'Study Set'}
          </Text>
          <Text className="text-[11px] font-medium text-slate-400">
            {set?.subject ?? 'General'}
          </Text>
        </View>

        <View className="w-12" />
      </View>

      {/* Segmented Top Tabs */}
      <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 mx-4 my-2.5 rounded-2xl">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Summary tab"
          onPress={() => router.replace(`/set/${id}`)}
          className={`flex-1 py-2 rounded-xl items-center ${
            isSummaryActive
              ? 'bg-white dark:bg-surface-darkSubtle shadow-sm'
              : ''
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isSummaryActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Summary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Flashcards tab"
          onPress={() => router.replace(`/set/${id}/flashcards`)}
          className={`flex-1 py-2 rounded-xl items-center ${
            isFlashcardsActive
              ? 'bg-white dark:bg-surface-darkSubtle shadow-sm'
              : ''
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isFlashcardsActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Cards ({set?.cards.length ?? 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Quiz tab"
          onPress={() => router.replace(`/set/${id}/quiz`)}
          className={`flex-1 py-2 rounded-xl items-center ${
            isQuizActive
              ? 'bg-white dark:bg-surface-darkSubtle shadow-sm'
              : ''
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isQuizActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Quiz
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1">
        <Slot />
      </View>
    </SafeAreaView>
  );
}
