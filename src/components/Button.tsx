import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  TouchableOpacityProps,
  GestureResponderEvent,
} from 'react-native';
import { safeHaptics } from '../utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  primary: {
    container: 'bg-primary-600 active:bg-primary-700 shadow-sm border border-transparent',
    text: 'text-white font-semibold',
    spinner: '#ffffff',
  },
  secondary: {
    container: 'bg-primary-50 active:bg-primary-100 border border-primary-200 dark:bg-slate-800 dark:border-slate-700',
    text: 'text-primary-700 dark:text-primary-300 font-semibold',
    spinner: '#4F46E5',
  },
  outline: {
    container: 'bg-transparent border border-slate-300 active:bg-slate-50 dark:border-slate-700 dark:active:bg-slate-800',
    text: 'text-slate-800 dark:text-slate-200 font-medium',
    spinner: '#64748B',
  },
  ghost: {
    container: 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-300 font-medium',
    spinner: '#64748B',
  },
  danger: {
    container: 'bg-rose-600 active:bg-rose-700 shadow-sm border border-transparent',
    text: 'text-white font-semibold',
    spinner: '#ffffff',
  },
  success: {
    container: 'bg-emerald-600 active:bg-emerald-700 shadow-sm border border-transparent',
    text: 'text-white font-semibold',
    spinner: '#ffffff',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string; iconSize: number }> = {
  sm: {
    container: 'min-h-[44px] px-3.5 py-2 rounded-xl gap-1.5',
    text: 'text-xs',
    iconSize: 16,
  },
  md: {
    container: 'min-h-[48px] px-5 py-3 rounded-2xl gap-2',
    text: 'text-sm',
    iconSize: 18,
  },
  lg: {
    container: 'min-h-[56px] px-6 py-4 rounded-2xl gap-2.5',
    text: 'text-base',
    iconSize: 20,
  },
};

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  accessibilityLabel,
  onPress,
  ...rest
}) => {
  const currentVariant = variantStyles[variant];
  const currentSize = sizeStyles[size];
  const isDisabled = disabled || loading;

  const handlePress = (e: GestureResponderEvent) => {
    if (isDisabled) return;
    void safeHaptics('light');
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      activeOpacity={0.75}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${currentSize.container} ${currentVariant.container} ${
        fullWidth ? 'w-full' : 'self-auto'
      } ${isDisabled ? 'opacity-50' : 'opacity-100'} ${className}`}
      onPress={handlePress}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.spinner} />
      ) : (
        <>
          {icon && iconPosition === 'left' ? (
            <View>{typeof icon === 'string' ? <Text className={`${currentSize.text} mr-1`}>{icon}</Text> : icon}</View>
          ) : null}
          <Text className={`${currentSize.text} ${currentVariant.text} tracking-wide`}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? (
            <View>{typeof icon === 'string' ? <Text className={`${currentSize.text} ml-1`}>{icon}</Text> : icon}</View>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
};
