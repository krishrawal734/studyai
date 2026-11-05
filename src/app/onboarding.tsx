import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSettingsStore } from '../store';
import { Button } from '../components/Button';
import { safeHaptics } from '../utils';

interface Slide {
  id: string;
  badge: string;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  highlightColor: string;
}

const slides: Slide[] = [
  {
    id: 'slide_1',
    badge: 'Step 1 · Input',
    emoji: '📝',
    title: 'Capture Notes in Any Format',
    subtitle: 'Photos, text, or documents',
    description:
      'Snap photos of lecture slides and handwritten notes, paste study text, or import files. Everything stays private on your device.',
    highlightColor: 'bg-primary-50 dark:bg-primary-950/40 text-primary-600',
  },
  {
    id: 'slide_2',
    badge: 'Step 2 · AI Generation',
    emoji: '✨',
    title: 'Instant AI Study Materials',
    subtitle: 'Summaries, cards & quizzes',
    description:
      'Turn rough notes into high-yield summaries, active-recall flashcards, and multiple-choice quizzes designed to test deep understanding.',
    highlightColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600',
  },
  {
    id: 'slide_3',
    badge: 'Step 3 · Mastery',
    emoji: '🔥',
    title: 'Spaced Repetition & Streaks',
    subtitle: 'Leitner 3-box system',
    description:
      'Review efficiently using spaced repetition intervals. Build daily study streaks, track your mastery, and ace your exams with confidence.',
    highlightColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-500',
  },
];

export default function Onboarding() {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const setOnboardingDone = useSettingsStore((state) => state.setOnboardingDone);

  const currentSlide = slides[currentSlideIndex];
  const isLastSlide = currentSlideIndex === slides.length - 1;

  const handleFinish = () => {
    void safeHaptics('success');
    setOnboardingDone(true);
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (isLastSlide) {
      handleFinish();
    } else {
      void safeHaptics('light');
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    void safeHaptics('light');
    handleFinish();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface-subtle dark:bg-surface-dark justify-between p-6">
      {/* Top Bar with Skip */}
      <View className="flex-row justify-between items-center h-12">
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-black text-primary-900 dark:text-white">
            Study<Text className="text-primary-600">AI</Text>
          </Text>
          <View className="bg-primary-50 dark:bg-primary-950/60 px-2 py-0.5 rounded-full border border-primary-200/60 dark:border-primary-800/60">
            <Text className="text-[10px] font-bold text-primary-700 dark:text-primary-300">
              by Krish Rawal
            </Text>
          </View>
        </View>

        {!isLastSlide ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={handleSkip}
            className="py-2 px-3 rounded-full"
            activeOpacity={0.7}
          >
            <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Skip
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {/* Main Slide Card */}
      <View className="items-center justify-center my-auto px-2">
        {/* Visual Hero */}
        <View className="w-28 h-28 rounded-3xl bg-white dark:bg-surface-darkSubtle items-center justify-center border-2 border-slate-200/80 dark:border-slate-800 shadow-lg mb-8">
          <Text className="text-5xl">{currentSlide.emoji}</Text>
        </View>

        {/* Step Badge */}
        <View className="bg-primary-50 dark:bg-primary-950/50 px-3.5 py-1.5 rounded-full border border-primary-200 dark:border-primary-800 mb-4">
          <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
            {currentSlide.badge}
          </Text>
        </View>

        {/* Title */}
        <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 text-center leading-tight mb-2">
          {currentSlide.title}
        </Text>

        <Text className="text-sm font-semibold text-primary-600 dark:text-primary-400 text-center mb-4">
          {currentSlide.subtitle}
        </Text>

        {/* Description */}
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-[320px]">
          {currentSlide.description}
        </Text>
      </View>

      {/* Bottom Controls */}
      <View className="gap-6 pb-2">
        {/* Dots indicator */}
        <View className="flex-row justify-center items-center gap-2">
          {slides.map((slide, index) => {
            const isActive = index === currentSlideIndex;
            return (
              <TouchableOpacity
                key={slide.id}
                onPress={() => {
                  void safeHaptics('light');
                  setCurrentSlideIndex(index);
                }}
                accessibilityLabel={`Go to slide ${index + 1}`}
                className={`h-2 rounded-full transition-all ${
                  isActive
                    ? 'w-7 bg-primary-600'
                    : 'w-2 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <Button
          label={isLastSlide ? 'Get Started 🚀' : 'Next →'}
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}
