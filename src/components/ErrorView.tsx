import React from 'react';
import { View, Text } from 'react-native';
import { Button } from './Button';

export interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorView: React.FC<ErrorViewProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an unexpected error. Please try again.',
  onRetry,
  onDismiss,
  className = '',
}) => {
  return (
    <View
      className={`items-center justify-center p-6 bg-rose-50/70 dark:bg-rose-950/20 rounded-3xl border border-rose-200 dark:border-rose-900 ${className}`}
    >
      <View className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/60 items-center justify-center mb-3">
        <Text className="text-2xl">⚠️</Text>
      </View>

      <Text className="text-base font-bold text-rose-900 dark:text-rose-200 text-center mb-1">
        {title}
      </Text>

      <Text className="text-xs text-rose-700 dark:text-rose-300 text-center leading-relaxed max-w-[280px] mb-5">
        {message}
      </Text>

      <View className="flex-row gap-2.5">
        {Boolean(onDismiss) && (
          <Button
            label="Dismiss"
            variant="ghost"
            size="sm"
            onPress={onDismiss}
          />
        )}
        {Boolean(onRetry) && (
          <Button
            label="Try Again"
            variant="danger"
            size="sm"
            onPress={onRetry}
          />
        )}
      </View>
    </View>
  );
};
