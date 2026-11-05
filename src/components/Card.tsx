import React from 'react';
import { View, TouchableOpacity, ViewProps, TouchableOpacityProps } from 'react-native';

export interface CardProps extends ViewProps {
  onPress?: TouchableOpacityProps['onPress'];
  activeOpacity?: number;
  accessibilityLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  activeOpacity = 0.75,
  accessibilityLabel,
  className = '',
  ...rest
}) => {
  const baseClasses =
    'bg-white dark:bg-surface-darkSubtle rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-sm';

  if (onPress) {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        activeOpacity={activeOpacity}
        className={`${baseClasses} min-h-[44px] ${className}`}
        {...(rest as TouchableOpacityProps)}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View className={`${baseClasses} ${className}`} {...rest}>
      {children}
    </View>
  );
};
