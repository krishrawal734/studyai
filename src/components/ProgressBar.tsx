import React from 'react';
import { View, Text } from 'react-native';

export type ProgressColor = 'primary' | 'streak' | 'success' | 'error';

export interface ProgressBarProps {
  progress: number; // 0 to 1 (or 0 to 100)
  color?: ProgressColor;
  showLabel?: boolean;
  height?: number;
  className?: string;
  accessibilityLabel?: string;
}

const colorMap: Record<ProgressColor, string> = {
  primary: 'bg-primary-600',
  streak: 'bg-amber-500',
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'primary',
  showLabel = false,
  height = 8,
  className = '',
  accessibilityLabel,
}) => {
  // Normalize to 0 - 100
  const normalizedPercentage = Math.min(
    100,
    Math.max(0, progress <= 1 && progress > 0 ? progress * 100 : progress)
  );
  const roundedPercentage = Math.round(normalizedPercentage);

  return (
    <View
      className={`w-full ${className}`}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `Progress ${roundedPercentage}%`}
      accessibilityValue={{ min: 0, max: 100, now: roundedPercentage }}
    >
      {showLabel && (
        <View className="flex-row justify-between items-center mb-1.5">
          <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Progress
          </Text>
          <Text className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {roundedPercentage}%
          </Text>
        </View>
      )}

      <View
        className="w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
        style={{ height }}
      >
        <View
          className={`h-full rounded-full ${colorMap[color]}`}
          style={{ width: `${normalizedPercentage}%` }}
        />
      </View>
    </View>
  );
};
