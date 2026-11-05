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
import { LeitnerBox, AnswerGradeResponse } from '../types';
import { aiService } from '../services/ai';
import { safeHaptics, safeAlert } from '../utils';

interface GradeAnswerModalProps {
  visible: boolean;
  onClose: () => void;
  question: string;
  referenceAnswer: string;
  onApplyBox: (box: LeitnerBox) => void;
}

export function GradeAnswerModal({
  visible,
  onClose,
  question,
  referenceAnswer,
  onApplyBox,
}: GradeAnswerModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const [studentAnswer, setStudentAnswer] = useState('');
  const [isGrading, setIsGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<AnswerGradeResponse | null>(null);

  const handleGrade = async () => {
    if (!studentAnswer.trim()) {
      safeAlert('Answer Required', 'Please type your recall answer in your own words before grading.');
      return;
    }

    void safeHaptics('medium');
    setIsGrading(true);
    setGradeResult(null);

    try {
      const res = await aiService.gradeAnswer(question, referenceAnswer, studentAnswer.trim());
      setGradeResult(res);
      void safeHaptics(res.score >= 80 ? 'success' : 'warning');
    } catch (err) {
      safeAlert('Grading Error', err instanceof Error ? err.message : 'Unable to evaluate answer.');
    } finally {
      setIsGrading(false);
    }
  };

  const handleApply = () => {
    if (!gradeResult) return;
    void safeHaptics('success');
    onApplyBox(gradeResult.suggestedBox);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setStudentAnswer('');
    setGradeResult(null);
    setIsGrading(false);
  };

  const handleModalClose = () => {
    handleReset();
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
              <View className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 items-center justify-center">
                <Text className="text-lg">✍️</Text>
              </View>
              <View>
                <Text className="text-base font-black text-slate-900 dark:text-slate-100">
                  AI Active Recall Grader
                </Text>
                <Text className="text-[11px] text-slate-400">
                  Type your recall answer for semantic AI evaluation
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

          {/* Question Box */}
          <View className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-3.5">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
              Recall Prompt
            </Text>
            <Text className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {question}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="max-h-[380px]">
            {/* Input Phase */}
            {!gradeResult && (
              <View className="gap-3">
                <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Your Answer (in your own words):
                </Text>

                <TextInput
                  value={studentAnswer}
                  onChangeText={setStudentAnswer}
                  placeholder="Explain the concept, formula, or key mechanism..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-slate-800 dark:text-slate-200 min-h-[95px]"
                />

                <TouchableOpacity
                  onPress={handleGrade}
                  disabled={isGrading}
                  className="bg-indigo-600 py-3 rounded-2xl items-center justify-center active:opacity-80 flex-row gap-2"
                >
                  {isGrading ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text className="text-xs font-bold text-white">Analyzing Semantics...</Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-xs">🤖</Text>
                      <Text className="text-xs font-bold text-white">Grade My Answer</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Results Phase */}
            {gradeResult && (
              <View className="gap-3">
                {/* Score Pill & Suggested Box */}
                <View className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex-row justify-between items-center">
                  <View className="flex-row items-center gap-2.5">
                    <View
                      className={`w-12 h-12 rounded-2xl items-center justify-center ${
                        gradeResult.score >= 80
                          ? 'bg-emerald-500'
                          : gradeResult.score >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      <Text className="text-base font-black text-white">
                        {gradeResult.score}%
                      </Text>
                    </View>
                    <View>
                      <Text className="text-xs font-black text-slate-900 dark:text-slate-100">
                        {gradeResult.score >= 80
                          ? 'Mastery Achieved! 🎯'
                          : gradeResult.score >= 50
                          ? 'Partial Retention 💡'
                          : 'Needs More Practice 🔁'}
                      </Text>
                      <Text className="text-[11px] text-slate-400">
                        Recommended: Leitner Box {gradeResult.suggestedBox}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                    <Text className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                      Box {gradeResult.suggestedBox}
                    </Text>
                  </View>
                </View>

                {/* Feedback Note */}
                <Text className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {gradeResult.feedback}
                </Text>

                {/* Nailed concepts */}
                {gradeResult.nailed.length > 0 && (
                  <View className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                    <Text className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                      ✅ What You Captured Correctly:
                    </Text>
                    {gradeResult.nailed.map((item, idx) => (
                      <Text key={idx} className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Missing details */}
                {gradeResult.missing.length > 0 && (
                  <View className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-100 dark:border-amber-900">
                    <Text className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mb-1">
                      ⚠️ Key Points or Terms Omitted:
                    </Text>
                    {gradeResult.missing.map((item, idx) => (
                      <Text key={idx} className="text-[11px] text-amber-700 dark:text-amber-400">
                        • {item}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Reference Model Answer */}
                <View className="bg-slate-100 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Model Reference Answer:
                  </Text>
                  <Text className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    {referenceAnswer}
                  </Text>
                </View>

                {/* Accept Button */}
                <TouchableOpacity
                  onPress={handleApply}
                  className="bg-indigo-600 py-3 rounded-2xl items-center justify-center active:opacity-80 mt-1"
                >
                  <Text className="text-xs font-bold text-white">
                    Apply Result & Move to Leitner Box {gradeResult.suggestedBox}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReset}
                  className="py-2 items-center justify-center active:opacity-70"
                >
                  <Text className="text-xs font-bold text-slate-400">Try Answering Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
