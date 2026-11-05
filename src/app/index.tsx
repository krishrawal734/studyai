import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSettingsStore } from '../store';
import { useHydration } from '../hooks';

export default function Index() {
  const onboardingDone = useSettingsStore((state) => state.onboardingDone);
  const hydrated = useHydration();

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-subtle dark:bg-surface-dark">
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
