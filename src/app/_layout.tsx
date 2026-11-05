import "../../global.css";
import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View } from "react-native";
import { useColorScheme } from "nativewind";
import { useSettingsStore } from "../store";
import { useHydration } from "../hooks";

export default function RootLayout() {
  const onboardingDone = useSettingsStore((state) => state.onboardingDone);
  const theme = useSettingsStore((state) => state.theme);
  const { colorScheme, setColorScheme } = useColorScheme();
  const segments = useSegments();
  const router = useRouter();

  const hydrated = useHydration();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  useEffect(() => {
    if (!hydrated) return;

    const rootSegment = segments[0] as string | undefined;
    // When still resolving root route (/), allow index.tsx to handle initial navigation
    if (!rootSegment) return;

    const inOnboarding = rootSegment === 'onboarding';

    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingDone && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [hydrated, onboardingDone, segments, router]);

  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaProvider>
      <View className="flex-1 bg-surface-subtle dark:bg-surface-dark">
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            contentStyle: {
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="set/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" options={{ headerShown: false }} />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}
