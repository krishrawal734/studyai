import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  onClear?: () => void;
  containerClassName?: string;
  inputClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  onClear,
  value,
  containerClassName = '',
  inputClassName = '',
  multiline = false,
  numberOfLines = 1,
  placeholderTextColor,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);

  const borderClass = hasError
    ? 'border-rose-500 dark:border-rose-500'
    : isFocused
    ? 'border-primary-600 dark:border-primary-400'
    : 'border-slate-200 dark:border-slate-700';

  return (
    <View className={`w-full ${containerClassName}`}>
      {Boolean(label) && (
        <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center bg-white dark:bg-surface-darkSubtle rounded-2xl border px-3.5 ${
          multiline ? 'py-3' : 'min-h-[48px]'
        } ${borderClass}`}
      >
        <TextInput
          value={value}
          multiline={multiline}
          numberOfLines={numberOfLines}
          placeholderTextColor={placeholderTextColor ?? '#94A3B8'}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`flex-1 text-sm text-slate-900 dark:text-slate-100 ${
            multiline ? 'min-h-[100px] text-top' : ''
          } ${inputClassName}`}
          style={multiline ? { textAlignVertical: 'top' } : undefined}
          {...rest}
        />

        {Boolean(value) && Boolean(onClear) && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Clear input"
            onPress={onClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="p-1 rounded-full bg-slate-100 dark:bg-slate-700 ml-2"
          >
            <Text className="text-xs text-slate-500 dark:text-slate-300 px-1">✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasError ? (
        <Text className="text-xs text-rose-500 font-medium mt-1.5 ml-1">
          {error}
        </Text>
      ) : Boolean(helperText) ? (
        <Text className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 ml-1">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
};
