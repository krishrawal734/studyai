import React from 'react';
import { View, Text } from 'react-native';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  emoji?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onPress: () => void;
    variant?: ButtonProps['variant'];
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  emoji = '📚',
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <View
      className={`items-center justify-center p-8 bg-white dark:bg-surface-darkSubtle rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 ${className}`}
    >
      <View className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-slate-800 items-center justify-center mb-4">
        {icon ? (
          typeof icon === 'string' ? (
            <Text className="text-3xl">{icon}</Text>
          ) : (
            icon
          )
        ) : (
          <Text className="text-3xl">{emoji}</Text>
        )}
      </View>

      <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 text-center mb-1.5">
        {title}
      </Text>

      <Text className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed max-w-[260px] mb-6">
        {description}
      </Text>

      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant={action.variant ?? 'primary'}
          size="sm"
        />
      ) : null}
    </View>
  );
};
