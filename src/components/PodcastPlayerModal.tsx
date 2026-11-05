import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import * as Speech from 'expo-speech';
import { StudySet } from '../types';
import { aiService } from '../services/ai';
import { useSetStore } from '../store';
import { safeHaptics, safeAlert } from '../utils';

interface PodcastPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  set: StudySet;
}

export function PodcastPlayerModal({
  visible,
  onClose,
  set,
}: PodcastPlayerModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const savePodcastScript = useSetStore((state) => state.savePodcastScript);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number>(0);

  const lines = set.podcastScript || [];

  const isRunningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setIsPlaying(false);
    isRunningRef.current = false;
    void Speech.stop();

    try {
      const generatedLines = await aiService.generatePodcastDialogue({
        title: set.title,
        subject: set.subject,
        summary: set.summary,
        keyPoints: set.keyPoints,
      });
      savePodcastScript(set.id, generatedLines);
      setActiveLineIdx(0);
      void safeHaptics('success');
    } catch (err) {
      safeAlert('Podcast Error', err instanceof Error ? err.message : 'Unable to generate dialogue.');
    } finally {
      setIsLoading(false);
    }
  }, [set.id, set.title, set.subject, set.summary, set.keyPoints, savePodcastScript]);

  // Stop audio on unmount or close
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      void Speech.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Generate script on open if not already cached
  useEffect(() => {
    if (!visible) return;
    if (!set.podcastScript || set.podcastScript.length === 0) {
      const timer = setTimeout(() => {
        void handleGenerate();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, set.podcastScript, handleGenerate]);

  const playLineAtIndex = (index: number) => {
    if (index >= lines.length) {
      setIsPlaying(false);
      isRunningRef.current = false;
      setActiveLineIdx(0);
      void safeHaptics('success');
      return;
    }

    setActiveLineIdx(index);
    const line = lines[index];
    if (!line) return;

    // Use lower pitch for Host, slightly higher pitch for Student
    const isHost = line.speaker === 'Host';
    const pitch = isHost ? 0.95 : 1.15;
    const rate = isHost ? 0.98 : 1.02;

    Speech.speak(line.text, {
      pitch,
      rate,
      onDone: () => {
        if (!isRunningRef.current) return;
        timerRef.current = setTimeout(() => {
          if (!isRunningRef.current) return;
          playLineAtIndex(index + 1);
        }, 500);
      },
      onError: () => {
        setIsPlaying(false);
        isRunningRef.current = false;
      },
    });
  };

  const handleTogglePlay = () => {
    void safeHaptics('light');

    if (isPlaying) {
      isRunningRef.current = false;
      void Speech.stop();
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsPlaying(false);
      return;
    }

    isRunningRef.current = true;
    setIsPlaying(true);
    playLineAtIndex(activeLineIdx);
  };

  const handleNextLine = () => {
    if (activeLineIdx >= lines.length - 1) return;
    void safeHaptics('light');
    void Speech.stop();
    const nextIdx = activeLineIdx + 1;
    setActiveLineIdx(nextIdx);
    if (isPlaying) {
      isRunningRef.current = true;
      playLineAtIndex(nextIdx);
    }
  };

  const handlePrevLine = () => {
    if (activeLineIdx <= 0) return;
    void safeHaptics('light');
    void Speech.stop();
    const prevIdx = activeLineIdx - 1;
    setActiveLineIdx(prevIdx);
    if (isPlaying) {
      isRunningRef.current = true;
      playLineAtIndex(prevIdx);
    }
  };

  const handleRestart = () => {
    void safeHaptics('light');
    void Speech.stop();
    setActiveLineIdx(0);
    if (isPlaying) {
      isRunningRef.current = true;
      playLineAtIndex(0);
    }
  };

  const handleClose = () => {
    isRunningRef.current = false;
    void Speech.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPlaying(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-black/60 justify-end sm:justify-center sm:items-center sm:p-4">
        <View
          style={{ maxHeight: Math.round(screenHeight * 0.88) }}
          className="w-full sm:max-w-xl bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl p-5 border-t sm:border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 items-center justify-center">
                <Text className="text-lg">🎙️</Text>
              </View>
              <View>
                <Text className="text-base font-black text-slate-900 dark:text-slate-100">
                  AI Study Podcast
                </Text>
                <Text className="text-[11px] text-slate-400">
                  Mentor & Student two-voice audio lecture
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-70"
            >
              <Text className="text-slate-500 font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Episode Info Pill */}
          <View className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-3.5 flex-row justify-between items-center">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Episode Topic
              </Text>
              <Text className="text-xs font-bold text-slate-800 dark:text-slate-200" numberOfLines={1}>
                {set.title}
              </Text>
            </View>

            <View className="bg-purple-50 dark:bg-purple-950/60 px-2.5 py-1 rounded-full border border-purple-200 dark:border-purple-800">
              <Text className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                {lines.length} Dialogue Turns
              </Text>
            </View>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="small" color="#9333ea" />
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                Writing Two-Voice Podcast Script...
              </Text>
              <Text className="text-[11px] text-slate-400 text-center mt-1">
                Creating natural dialogue between Professor and Student
              </Text>
            </View>
          )}

          {/* Transcript List */}
          {!isLoading && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              className="max-h-[300px] mb-3"
            >
              <View className="gap-2.5">
                {lines.map((line, idx) => {
                  const isActive = idx === activeLineIdx && isPlaying;
                  const isHost = line.speaker === 'Host';

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        void safeHaptics('light');
                        void Speech.stop();
                        setActiveLineIdx(idx);
                        if (isPlaying) {
                          isRunningRef.current = true;
                          playLineAtIndex(idx);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-purple-100/70 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 shadow-sm'
                          : isHost
                          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
                          : 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/60'
                      }`}
                    >
                      <View className="flex-row items-center gap-1.5 mb-1">
                        <Text className="text-xs">{isHost ? '🎙️' : '🙋‍♂️'}</Text>
                        <Text
                          className={`text-[10px] font-black uppercase ${
                            isHost
                              ? 'text-purple-700 dark:text-purple-300'
                              : 'text-indigo-700 dark:text-indigo-300'
                          }`}
                        >
                          {isHost ? 'Professor (Mentor)' : 'Student'}
                        </Text>
                        {isActive && (
                          <View className="bg-purple-600 px-1.5 py-0.2 rounded-full ml-auto">
                            <Text className="text-[9px] font-black text-white">NOW SPEAKING</Text>
                          </View>
                        )}
                      </View>

                      <Text
                        className={`text-xs leading-relaxed ${
                          isActive
                            ? 'text-slate-950 dark:text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {line.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Media Player Controls */}
          {!isLoading && lines.length > 0 && (
            <View className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-2xl flex-row items-center justify-between">
              <TouchableOpacity
                onPress={handleRestart}
                className="p-2 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700"
              >
                <Text className="text-xs">⏮️</Text>
              </TouchableOpacity>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={handlePrevLine}
                  disabled={activeLineIdx === 0}
                  className="p-2 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <Text className="text-xs">⏪</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleTogglePlay}
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 flex-row items-center gap-1.5 active:opacity-80"
                >
                  <Text className="text-xs">{isPlaying ? '⏸️' : '▶️'}</Text>
                  <Text className="text-xs font-black text-white">
                    {isPlaying ? 'Pause' : 'Play Podcast'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleNextLine}
                  disabled={activeLineIdx === lines.length - 1}
                  className="p-2 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                >
                  <Text className="text-xs">⏩</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => void handleGenerate()}
                className="p-2 rounded-xl bg-white dark:bg-surface-darkSubtle border border-slate-200 dark:border-slate-700"
              >
                <Text className="text-xs">🔄</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
