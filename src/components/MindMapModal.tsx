import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StudySet } from '../types';
import { aiService } from '../services/ai';
import { useSetStore } from '../store';
import { safeHaptics, safeAlert } from '../utils';

interface MindMapModalProps {
  visible: boolean;
  onClose: () => void;
  set: StudySet;
}

export function MindMapModal({ visible, onClose, set }: MindMapModalProps) {
  const { height: screenHeight } = useWindowDimensions();
  const saveMindMap = useSetStore((state) => state.saveMindMap);
  const [isLoading, setIsLoading] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  const mindMap = set.mindMap || null;

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);

    try {
      const generated = await aiService.generateMindMap({
        title: set.title,
        subject: set.subject,
        summary: set.summary,
        keyPoints: set.keyPoints,
        cards: set.cards.map((c) => ({ question: c.question, answer: c.answer })),
      });
      saveMindMap(set.id, generated);
      void safeHaptics('success');
    } catch (err) {
      safeAlert('Mind Map Error', err instanceof Error ? err.message : 'Unable to generate concept map.');
    } finally {
      setIsLoading(false);
    }
  }, [set.id, set.title, set.subject, set.summary, set.keyPoints, set.cards, saveMindMap]);

  useEffect(() => {
    if (!visible) return;
    if (!set.mindMap) {
      const timer = setTimeout(() => {
        void handleGenerate();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, set.mindMap, handleGenerate]);

  const toggleNode = (nodeId: string) => {
    void safeHaptics('light');
    setCollapsedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end sm:justify-center sm:items-center sm:p-4">
        <View
          style={{ maxHeight: Math.round(screenHeight * 0.88) }}
          className="w-full sm:max-w-xl bg-white dark:bg-surface-dark rounded-t-3xl sm:rounded-3xl p-5 border-t sm:border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 items-center justify-center">
                <Text className="text-lg">🗺️</Text>
              </View>
              <View>
                <Text className="text-base font-black text-slate-900 dark:text-slate-100">
                  Concept Mind Map
                </Text>
                <Text className="text-[11px] text-slate-400">
                  Interactive knowledge hierarchy & concept relations
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center active:opacity-70"
            >
              <Text className="text-slate-500 font-bold">✕</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View className="py-20 items-center justify-center">
              <ActivityIndicator size="small" color="#0d9488" />
              <Text className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                Synthesizing Concept Hierarchy...
              </Text>
              <Text className="text-[11px] text-slate-400 text-center mt-1">
                Clustering topics, formulas, and flashcard terms into a visual tree
              </Text>
            </View>
          )}

          {/* Content Tree */}
          {!isLoading && mindMap && (
            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[380px] pb-3">
              {/* Root Node */}
              <View className="bg-teal-50 dark:bg-teal-950/40 p-4 rounded-2xl border-2 border-teal-500 mb-4 items-center">
                <View className="bg-teal-100 dark:bg-teal-900/60 px-2.5 py-0.5 rounded-full mb-1">
                  <Text className="text-[10px] font-black text-teal-800 dark:text-teal-200 uppercase">
                    Central Subject
                  </Text>
                </View>
                <Text className="text-sm font-black text-slate-900 dark:text-slate-100 text-center">
                  {mindMap.label}
                </Text>
                {mindMap.summary && (
                  <Text className="text-[11px] text-slate-500 dark:text-slate-400 text-center mt-1">
                    {mindMap.summary}
                  </Text>
                )}
              </View>

              {/* Branches */}
              <View className="gap-3 pl-2">
                {mindMap.children?.map((branch, bIdx) => {
                  const isCollapsed = Boolean(collapsedNodes[branch.id]);
                  const hasChildren = Boolean(branch.children && branch.children.length > 0);

                  return (
                    <View
                      key={branch.id || bIdx}
                      className="border-l-2 border-teal-300 dark:border-teal-700 pl-3.5 pb-2"
                    >
                      {/* Branch Header Card */}
                      <TouchableOpacity
                        onPress={() => hasChildren && toggleNode(branch.id)}
                        activeOpacity={hasChildren ? 0.75 : 1}
                        className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800"
                      >
                        <View className="flex-row justify-between items-center mb-1">
                          <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                            <Text className="text-xs">🌿</Text>
                            <Text
                              className="text-xs font-black text-slate-900 dark:text-slate-100"
                              numberOfLines={1}
                            >
                              {branch.label}
                            </Text>
                          </View>

                          {hasChildren && (
                            <View className="flex-row items-center gap-1 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              <Text className="text-[10px] text-slate-500 font-bold">
                                {branch.children?.length}
                              </Text>
                              <Text className="text-[10px] text-slate-400">
                                {isCollapsed ? '▼' : '▲'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {branch.summary && (
                          <Text className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                            {branch.summary}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {/* Sub-Leaves Nested */}
                      {!isCollapsed && hasChildren && (
                        <View className="mt-2.5 gap-2 pl-3 border-l border-dashed border-slate-300 dark:border-slate-700">
                          {branch.children?.map((leaf, lIdx) => (
                            <View
                              key={leaf.id || lIdx}
                              className="bg-white dark:bg-surface-darkSubtle p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-700/70"
                            >
                              <Text className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                • {leaf.label}
                              </Text>
                              {leaf.summary && (
                                <Text className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                  {leaf.summary}
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Footer Refresh */}
          {!isLoading && mindMap && (
            <View className="flex-row justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 mt-2">
              <Text className="text-[11px] text-slate-400">
                Tap branches to expand or collapse sub-concepts
              </Text>
              <TouchableOpacity
                onPress={() => void handleGenerate()}
                className="px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex-row items-center gap-1 active:opacity-70"
              >
                <Text className="text-xs">🔄</Text>
                <Text className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  Regenerate Tree
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
