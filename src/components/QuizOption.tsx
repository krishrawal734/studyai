import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

export type QuizOptionState = 'default' | 'selected' | 'correct' | 'incorrect';

export interface QuizOptionProps {
  index: number; // 0 -> A, 1 -> B, etc.
  optionText: string;
  state?: QuizOptionState;
  disabled?: boolean;
  onPress: () => void;
  className?: string;
}

const letterLabels = ['A', 'B', 'C', 'D'];

const stateStyles: Record<
  QuizOptionState,
  {
    container: string;
    letterBadge: string;
    letterText: string;
    optionText: string;
    icon?: string;
  }
> = {
  default: {
    container: 'bg-white dark:bg-surface-darkSubtle border-slate-200 dark:border-slate-800',
    letterBadge: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
    letterText: 'text-slate-700 dark:text-slate-300 font-bold',
    optionText: 'text-slate-800 dark:text-slate-200',
  },
  selected: {
    container: 'bg-primary-50 dark:bg-primary-950/40 border-primary-500 dark:border-primary-500 shadow-sm',
    letterBadge: 'bg-primary-600 border-primary-600',
    letterText: 'text-white font-bold',
    optionText: 'text-primary-900 dark:text-primary-100 font-semibold',
  },
  correct: {
    container: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500',
    letterBadge: 'bg-emerald-600 border-emerald-600',
    letterText: 'text-white font-bold',
    optionText: 'text-emerald-900 dark:text-emerald-100 font-semibold',
    icon: '✓',
  },
  incorrect: {
    container: 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 dark:border-rose-500',
    letterBadge: 'bg-rose-600 border-rose-600',
    letterText: 'text-white font-bold',
    optionText: 'text-rose-900 dark:text-rose-100 font-semibold',
    icon: '✕',
  },
};

export const QuizOption: React.FC<QuizOptionProps> = ({
  index,
  optionText,
  state = 'default',
  disabled = false,
  onPress,
  className = '',
}) => {
  const currentStyles = stateStyles[state];
  const letter = letterLabels[index] ?? String(index + 1);

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Option ${letter}: ${optionText}`}
      accessibilityState={{ selected: state === 'selected', disabled }}
      activeOpacity={0.8}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[56px] w-full flex-row items-center justify-between p-4 rounded-2xl border-2 mb-3 ${
        currentStyles.container
      } ${disabled && state === 'default' ? 'opacity-60' : 'opacity-100'} ${className}`}
    >
      <View className="flex-row items-center flex-1 mr-3 gap-3">
        <View
          className={`w-8 h-8 rounded-xl items-center justify-center border ${currentStyles.letterBadge}`}
        >
          <Text className={`text-xs ${currentStyles.letterText}`}>{letter}</Text>
        </View>

        <Text className={`text-sm flex-1 leading-snug ${currentStyles.optionText}`}>
          {optionText}
        </Text>
      </View>

      {Boolean(currentStyles.icon) && (
        <View className="w-6 h-6 rounded-full items-center justify-center">
          <Text
            className={`text-sm font-black ${
              state === 'correct' ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {currentStyles.icon}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
