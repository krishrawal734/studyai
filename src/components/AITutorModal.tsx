import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { AITutorMode, AITutorResponse } from '../types';
import { aiService } from '../services/ai';
import { speakText, stopSpeech, safeHaptics, safeAlert } from '../utils';

interface AITutorModalProps {
  visible: boolean;
  onClose: () => void;
  question: string;
  answer: string;
}

const MODES: { id: AITutorMode; label: string; icon: string }[] = [
  { id: 'eli5', label: 'ELI5', icon: '💡' },
  { id: 'mnemonic', label: 'Mnemonic', icon: '🧠' },
  { id: 'example', label: 'Real Example', icon: '🎯' },
  { id: 'custom', label: 'Ask Question', icon: '💬' },
];

export function AITutorModal({
  visible,
  onClose,
  question,
  answer,
}: AITutorModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<AITutorMode>('eli5');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AITutorResponse | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleFetchTutor = async (mode: AITutorMode, prompt?: string) => {
    void safeHaptics('light');
    setSelectedMode(mode);
    setIsLoading(true);
    setResponse(null);
    void stopSpeech();
    setIsSpeaking(false);

    try {
      const res = await aiService.askTutor(question, answer, mode, prompt);
      setResponse(res);
      void safeHaptics('success');
    } catch (err) {
      safeAlert('Tutor Error', err instanceof Error ? err.message : 'Unable to generate tutor explanation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: AITutorMode) => {
    if (mode === selectedMode && response) return;
    if (mode === 'custom') {
      setSelectedMode('custom');
      setResponse(null);
      return;
    }
    void handleFetchTutor(mode);
  };

  const handleCustomSubmit = () => {
    if (!customQuestion.trim()) {
      safeAlert('Question Required', 'Please enter a question to ask the AI Tutor.');
      return;
    }
    void handleFetchTutor('custom', customQuestion.trim());
  };

  const handleToggleSpeech = async () => {
    if (!response) return;
    void safeHaptics('light');

    if (isSpeaking) {
      await stopSpeech();
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const textToRead = `${response.answer}. ${response.keyTakeaway ?? ''}`;
    await speakText(textToRead, () => setIsSpeaking(false));
  };

  const handleModalClose = () => {
    void stopSpeech();
    setIsSpeaking(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleModalClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/60 justify-end sm:justify-center sm:items-center sm:p-4"
      >
        <View
          style={{ maxHeight: Math.round(screenHeight * 0.88) }}
          className="w-full sm:max-w-lg bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl p-5 border-t sm:border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950/60 items-center justify-center">
                <Text className="text-lg">🤖</Text>
              </View>
              <View>
                <Text className="text-base font-black text-slate-900 dark:text-slate-100">
                  AI Socratic Tutor
                </Text>
                <Text className="text-[11px] text-slate-400">
                  Adaptive explanations, mnemonics & analogies
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleModalClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-70"
            >
              <Text className="text-slate-500 font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Flashcard Question Reference */}
          <View className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-3.5">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Target Card
            </Text>
            <Text className="text-xs font-bold text-slate-800 dark:text-slate-200" numberOfLines={2}>
              {question}
            </Text>
          </View>

          {/* Mode Selector Tabs */}
          <View className="flex-row gap-1.5 mb-4">
            {MODES.map((m) => {
              const isSelected = selectedMode === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => handleModeChange(m.id)}
                  className={`flex-1 py-2 items-center rounded-xl border flex-row justify-center gap-1 ${
                    isSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Text className="text-xs">{m.icon}</Text>
                  <Text
                    className={`text-[11px] font-bold ${
                      isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Question Input Row */}
          {selectedMode === 'custom' && (
            <View className="flex-row items-center gap-2 mb-3.5">
              <TextInput
                value={customQuestion}
                onChangeText={setCustomQuestion}
                placeholder="Ask what you're confused about..."
                placeholderTextColor="#94a3b8"
                className="flex-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200"
              />
              <TouchableOpacity
                onPress={handleCustomSubmit}
                disabled={isLoading}
                className="bg-primary-600 px-3.5 py-2 rounded-xl active:opacity-70"
              >
                <Text className="text-xs font-bold text-white">Ask</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Content Area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="min-h-[140px] max-h-[300px]"
          >
            {isLoading && (
              <View className="py-10 items-center justify-center">
                <ActivityIndicator size="small" color="#4f46e5" />
                <Text className="text-xs font-semibold text-slate-400 mt-2">
                  Consulting AI Tutor...
                </Text>
              </View>
            )}

            {!isLoading && !response && (
              <View className="py-8 items-center justify-center">
                <Text className="text-2xl mb-1">💡</Text>
                <Text className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Select a mode above to get an instant AI breakdown or mnemonic hook.
                </Text>
                {selectedMode !== 'custom' && (
                  <TouchableOpacity
                    onPress={() => void handleFetchTutor(selectedMode)}
                    className="mt-3 px-4 py-2 bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 rounded-xl"
                  >
                    <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
                      Generate {MODES.find((m) => m.id === selectedMode)?.label}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isLoading && response && (
              <View className="gap-2.5 pb-2">
                <View className="bg-primary-50/50 dark:bg-primary-950/30 p-3.5 rounded-2xl border border-primary-100 dark:border-primary-900/50">
                  <Text className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-normal">
                    {response.answer}
                  </Text>
                </View>

                {response.mnemonic && (
                  <View className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/80 flex-row items-center gap-2">
                    <Text className="text-base">🧠</Text>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-amber-800 dark:text-amber-200 uppercase">
                        Memory Hook
                      </Text>
                      <Text className="text-xs font-black text-amber-900 dark:text-amber-100">
                        {response.mnemonic}
                      </Text>
                    </View>
                  </View>
                )}

                {response.keyTakeaway && (
                  <View className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/80">
                    <Text className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                      💡 {response.keyTakeaway}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Footer */}
          {response && !isLoading && (
            <View className="flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <TouchableOpacity
                onPress={handleToggleSpeech}
                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                <Text className="text-xs">{isSpeaking ? '⏹️' : '🔊'}</Text>
                <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {isSpeaking ? 'Stop Audio' : 'Listen to Tutor'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handleFetchTutor(selectedMode)}
                className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800"
              >
                <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
                  🔄 Regenerate
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
