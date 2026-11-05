import React from 'react';
import { View, Text } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <SafeAreaView className="flex-1 bg-surface-subtle dark:bg-surface-dark items-center justify-center p-6">
        <View className="items-center max-w-sm">
          <Text className="text-6xl mb-4">🔍</Text>
          <Text className="text-2xl font-black text-slate-900 dark:text-slate-100 text-center mb-2">
            Screen Does Not Exist
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-6">
            The study page or screen you were looking for does not exist or was moved.
          </Text>
          <Button
            label="Go to Home"
            variant="primary"
            size="md"
            onPress={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    </>
  );
}
