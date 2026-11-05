import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

export type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
export type ChipSize = 'sm' | 'md';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: ChipVariant;
  size?: ChipSize;
  icon?: React.ReactNode;
  onRemove?: () => void;
  className?: string;
  accessibilityLabel?: string;
}

const variantStyles: Record<ChipVariant, { unselected: string; selected: string; textUnselected: string; textSelected: string }> = {
  default: {
    unselected: 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700',
    selected: 'bg-slate-900 border-slate-900 dark:bg-slate-100 dark:border-slate-100',
    textUnselected: 'text-slate-600 dark:text-slate-300',
    textSelected: 'text-white dark:text-slate-900 font-semibold',
  },
  primary: {
    unselected: 'bg-primary-50 border-primary-200 dark:bg-slate-800 dark:border-primary-900',
    selected: 'bg-primary-600 border-primary-600 dark:bg-primary-500 dark:border-primary-500',
    textUnselected: 'text-primary-700 dark:text-primary-300',
    textSelected: 'text-white font-semibold',
  },
  success: {
    unselected: 'bg-emerald-50 border-emerald-200 dark:bg-slate-800 dark:border-emerald-900',
    selected: 'bg-emerald-600 border-emerald-600',
    textUnselected: 'text-emerald-700 dark:text-emerald-300',
    textSelected: 'text-white font-semibold',
  },
  warning: {
    unselected: 'bg-amber-50 border-amber-200 dark:bg-slate-800 dark:border-amber-900',
    selected: 'bg-amber-500 border-amber-500',
    textUnselected: 'text-amber-800 dark:text-amber-300',
    textSelected: 'text-white font-semibold',
  },
  error: {
    unselected: 'bg-rose-50 border-rose-200 dark:bg-slate-800 dark:border-rose-900',
    selected: 'bg-rose-600 border-rose-600',
    textUnselected: 'text-rose-700 dark:text-rose-300',
    textSelected: 'text-white font-semibold',
  },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onPress,
  variant = 'default',
  size = 'md',
  icon,
  onRemove,
  className = '',
  accessibilityLabel,
}) => {
  const currentVariant = variantStyles[variant];
  const isSm = size === 'sm';

  const containerClasses = `flex-row items-center justify-center rounded-full border ${
    isSm ? 'px-2.5 py-1 min-h-[32px]' : 'px-3.5 py-2 min-h-[44px]'
  } ${selected ? currentVariant.selected : currentVariant.unselected} ${className}`;

  const textClasses = `${isSm ? 'text-xs' : 'text-sm'} ${
    selected ? currentVariant.textSelected : currentVariant.textUnselected
  }`;

  if (onPress && onRemove) {
    return (
      <View className={containerClasses}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ selected }}
          onPress={onPress}
          activeOpacity={0.75}
          className="flex-row items-center"
        >
          {Boolean(icon) && (
            <View className="mr-1.5">
              {typeof icon === 'string' ? <Text className="text-xs">{icon}</Text> : icon}
            </View>
          )}
          <Text className={textClasses}>{label}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          onPress={onRemove}
          className="ml-1.5 p-0.5 rounded-full"
        >
          <Text className={`text-xs ${selected ? currentVariant.textSelected : currentVariant.textUnselected}`}>
            ✕
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected }}
        onPress={onPress}
        activeOpacity={0.75}
        className={containerClasses}
      >
        {Boolean(icon) && (
          <View className="mr-1.5">
            {typeof icon === 'string' ? <Text className="text-xs">{icon}</Text> : icon}
          </View>
        )}
        <Text className={textClasses}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className={containerClasses}>
      {Boolean(icon) && (
        <View className="mr-1.5">
          {typeof icon === 'string' ? <Text className="text-xs">{icon}</Text> : icon}
        </View>
      )}
      <Text className={textClasses}>{label}</Text>
    </View>
  );
};
