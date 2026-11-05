import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';
import { safeHaptics } from '../utils';
import { useStatsStore } from '../store';

export interface PomodoroTimerProps {
  visible: boolean;
  onClose: () => void;
  subjectTitle?: string;
}

const POMODORO_DURATION_SECONDS = 25 * 60; // 25 minutes

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({
  visible,
  onClose,
  subjectTitle = 'Study Session',
}) => {
  const recordSession = useStatsStore((state) => state.recordSession);

  const [secondsRemaining, setSecondsRemaining] = useState(POMODORO_DURATION_SECONDS);
  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            setIsCompleted(true);
            void safeHaptics('success');
            recordSession(0, 25);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, recordSession]);

  const toggleTimer = () => {
    void safeHaptics('light');
    setIsActive((prev) => !prev);
  };

  const resetTimer = () => {
    void safeHaptics('light');
    setIsActive(false);
    setIsCompleted(false);
    setSecondsRemaining(POMODORO_DURATION_SECONDS);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = Math.round(
    ((POMODORO_DURATION_SECONDS - secondsRemaining) / POMODORO_DURATION_SECONDS) * 100
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-5">
        <View className="w-full max-w-sm bg-white dark:bg-surface-darkSubtle rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl items-center">
          {/* Header */}
          <View className="w-full flex-row justify-between items-center mb-4">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl">⏱️</Text>
              <Text className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pomodoro Focus
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="p-1 rounded-full bg-slate-100 dark:bg-slate-800"
            >
              <Text className="text-xs text-slate-500 px-2 py-0.5 font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          <Text
            className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-6 text-center"
            numberOfLines={1}
          >
            {subjectTitle}
          </Text>

          {/* Time Display */}
          <View className="w-40 h-40 rounded-full bg-primary-50 dark:bg-primary-950/40 border-4 border-primary-500 items-center justify-center mb-6 shadow-sm">
            <Text className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-wider">
              {formatTime(secondsRemaining)}
            </Text>
            <Text className="text-[11px] font-bold text-primary-600 uppercase mt-1">
              {isCompleted ? 'Finished! 🎉' : isActive ? 'Focus Time' : 'Paused'}
            </Text>
          </View>

          {/* Progress Bar */}
          <ProgressBar progress={progress} height={8} className="w-full mb-6" />

          {/* Motivation or Finished message */}
          {isCompleted ? (
            <View className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl mb-6 w-full items-center">
              <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                Session Complete! +25 mins logged 🎯
              </Text>
            </View>
          ) : (
            <Text className="text-xs text-slate-400 text-center mb-6">
              25 minutes of unbroken focus followed by a 5-minute cognitive rest.
            </Text>
          )}

          {/* Controls */}
          <View className="w-full flex-row gap-3">
            <Button
              label={isActive ? 'Pause' : 'Start Focus'}
              variant={isActive ? 'outline' : 'primary'}
              size="md"
              className="flex-1"
              onPress={toggleTimer}
            />
            <Button
              label="Reset"
              variant="ghost"
              size="md"
              className="flex-1"
              onPress={resetTimer}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};
