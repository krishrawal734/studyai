import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useLibrary, SortOption } from '../../hooks/useLibrary';
import { useSetStore } from '../../store';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { Button } from '../../components/Button';
import { DEFAULT_SUBJECTS } from '../../constants/theme';
import { formatStudyDate, importStudyDeckFromFile, safeHaptics, safeAlert } from '../../utils';
import { Card as CardType, Quiz as QuizType, LeitnerBox } from '../../types';

export default function LibraryScreen() {
  const {
    sets,
    filteredSets,
    searchQuery,
    setSearchQuery,
    selectedSubject,
    setSelectedSubject,
    sortBy,
    setSortBy,
    subjectCounts,
    editingSet,
    editTitle,
    setEditTitle,
    editSubject,
    setEditSubject,
    startRename,
    cancelRename,
    saveRename,
    promptDelete,
  } = useLibrary();

  const addSet = useSetStore((state) => state.addSet);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportDeck = async () => {
    if (isImporting) return;
    setIsImporting(true);
    try {
      const res = await importStudyDeckFromFile();
      if (!res.success) {
        if (res.error && res.error !== 'Import cancelled') {
          safeAlert('Import Failed', res.error);
        }
        return;
      }

      if (res.deckData) {
        const now = new Date().toISOString();
        const newCards: CardType[] = res.deckData.cards.map((c, i) => ({
          id: `card_${Date.now()}_${i}`,
          question: c.question,
          answer: c.answer,
          box: (c.box as LeitnerBox) ?? 1,
          nextReview: now,
          createdAt: now,
          starred: Boolean(c.starred),
        }));

        const newQuizzes: QuizType[] = (res.deckData.quizzes ?? []).map((q, i) => ({
          id: `quiz_${Date.now()}_${i}`,
          questions: q.questions,
          lastScore: null,
          attempts: 0,
        }));

        const created = addSet({
          title: res.deckData.title,
          subject: res.deckData.subject || 'General',
          summary: res.deckData.summary || '',
          keyPoints: res.deckData.keyPoints || [],
          sourceType: res.deckData.sourceType || 'text',
          cards: newCards,
          quizzes: newQuizzes,
        });

        void safeHaptics('success');
        safeAlert(
          'Deck Imported!',
          `Successfully imported "${created.title}" with ${created.cards.length} flashcards.`,
          [
            {
              text: 'View Deck',
              onPress: () => router.push(`/set/${created.id}`),
            },
            { text: 'Done', style: 'cancel' },
          ]
        );
      }
    } catch {
      safeAlert('Import Error', 'Could not parse or import the file.');
    } finally {
      setIsImporting(false);
    }
  };

  const sortLabels: Record<SortOption, string> = {
    newest: 'Newest First',
    oldest: 'Oldest First',
    alphabetical: 'Title (A-Z)',
    cards: 'Most Cards',
  };

  return (
    <SafeAreaView
      className="flex-1 bg-surface-subtle dark:bg-surface-dark"
      edges={['top', 'left', 'right']}
    >
      {/* Header & Search */}
      <View className="p-5 pb-2">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-black text-slate-900 dark:text-slate-100">
              Study Library
            </Text>
            <Text className="text-xs text-slate-400 mt-0.5">
              Manage your generated study materials
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Import study set"
              onPress={handleImportDeck}
              disabled={isImporting}
              className="px-3 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800 flex-row items-center gap-1.5"
            >
              <Text className="text-xs">📥</Text>
              <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
                {isImporting ? '...' : 'Import'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change sort order"
              onPress={() => setShowSortOptions((prev) => !prev)}
              className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                ⇅ {sortLabels[sortBy]}
              </Text>
            </TouchableOpacity>

            <View className="bg-primary-100 dark:bg-primary-950/60 px-2.5 py-1.5 rounded-full">
              <Text className="text-xs font-bold text-primary-700 dark:text-primary-300">
                {sets.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Sort Options Pills (Collapsible) */}
        {showSortOptions && (
          <View className="flex-row gap-1.5 mb-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl">
            {(['newest', 'alphabetical', 'cards', 'oldest'] as SortOption[]).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => {
                  setSortBy(s);
                  setShowSortOptions(false);
                }}
                className={`flex-1 py-1.5 rounded-xl items-center ${
                  sortBy === s ? 'bg-white dark:bg-surface-darkSubtle shadow-sm' : ''
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    sortBy === s
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s === 'alphabetical'
                    ? 'A-Z'
                    : s === 'cards'
                    ? 'Cards'
                    : s === 'newest'
                    ? 'Recent'
                    : 'Oldest'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Search Bar */}
        <Input
          placeholder="Search by topic, concept, question, keyword..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
          containerClassName="mb-3"
        />

        {/* Subject Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
        >
          <Chip
            label={`All (${sets.length})`}
            selected={selectedSubject === null}
            onPress={() => setSelectedSubject(null)}
            size="sm"
          />
          {DEFAULT_SUBJECTS.map((subject) => {
            const count = subjectCounts[subject] ?? 0;
            if (count === 0 && selectedSubject !== subject) return null;
            return (
              <Chip
                key={subject}
                label={`${subject} (${count})`}
                selected={selectedSubject === subject}
                onPress={() =>
                  setSelectedSubject(selectedSubject === subject ? null : subject)
                }
                size="sm"
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Sets List */}
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 10, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredSets.length === 0 ? (
          <View>
            <EmptyState
              emoji="🔍"
              title={sets.length === 0 ? 'Your library is empty' : 'No matching study sets'}
              description={
                sets.length === 0
                  ? 'Create a study set by pasting notes, taking a photo, or uploading a document.'
                  : 'Try adjusting your search query or subject filters.'
              }
              action={
                sets.length === 0
                  ? {
                      label: 'Create First Study Set',
                      onPress: () => router.push('/(tabs)/create'),
                    }
                  : {
                      label: 'Clear Filters',
                      onPress: () => {
                        setSearchQuery('');
                        setSelectedSubject(null);
                      },
                      variant: 'outline',
                    }
              }
            />
            {sets.length === 0 && (
              <View className="items-center mt-3">
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Import study deck JSON"
                  onPress={handleImportDeck}
                  disabled={isImporting}
                  className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white dark:bg-surface-darkSubtle border border-slate-200/90 dark:border-slate-800 shadow-sm"
                >
                  <Text className="text-sm">📥</Text>
                  <Text className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isImporting ? 'Importing File...' : 'Or Import Shared Deck (JSON)'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View className="gap-3.5">
            {filteredSets.map((item) => {
              const masteredCards = item.cards.filter((c) => c.box === 3).length;
              const box1Cards = item.cards.filter((c) => c.box === 1).length;

              const sourceIcon = {
                text: '📝',
                image: '📸',
                file: '📄',
              }[item.sourceType] ?? '📝';

              return (
                <Card key={item.id} className="p-4">
                  {/* Clickable Card Body navigates to Set Summary */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={`Open study set: ${item.title}`}
                    onPress={() => router.push(`/set/${item.id}`)}
                    activeOpacity={0.75}
                  >
                    {/* Top Bar: Subject, Source & Date */}
                    <View className="flex-row justify-between items-center mb-2">
                      <View className="flex-row items-center gap-1.5">
                        <Chip label={item.subject} size="sm" variant="primary" />
                        <View className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] text-slate-500">
                            {sourceIcon} {item.sourceType}
                          </Text>
                        </View>
                      </View>

                      <Text className="text-[11px] text-slate-400">
                        {formatStudyDate(item.createdAt)}
                      </Text>
                    </View>

                    {/* Title & Summary */}
                    <Text className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                      {item.title}
                    </Text>

                    <Text
                      className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3 line-clamp-2"
                      numberOfLines={2}
                    >
                      {item.summary}
                    </Text>

                    {/* Mastery & Review Status */}
                    <View className="flex-row items-center gap-3 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mb-3">
                      <Text className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        🃏 {item.cards.length} cards
                      </Text>
                      <Text className="text-[11px] text-slate-300">·</Text>
                      <Text className="text-[11px] font-semibold text-emerald-600">
                        ★ {masteredCards} mastered
                      </Text>
                      {box1Cards > 0 && (
                        <>
                          <Text className="text-[11px] text-slate-300">·</Text>
                          <Text className="text-[11px] font-semibold text-rose-500">
                            ⚡ {box1Cards} due
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <View className="flex-row justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <View className="flex-row gap-2">
                      <Button
                        label="Cards"
                        size="sm"
                        variant="secondary"
                        onPress={() => router.push(`/set/${item.id}/flashcards`)}
                      />
                      <Button
                        label="Quiz"
                        size="sm"
                        variant="outline"
                        onPress={() => router.push(`/set/${item.id}/quiz`)}
                      />
                    </View>

                    {/* Rename & Delete controls */}
                    <View className="flex-row gap-1">
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Rename ${item.title}`}
                        onPress={() => startRename(item)}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 active:bg-slate-200"
                      >
                        <Text className="text-xs">✏️</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${item.title}`}
                        onPress={() => promptDelete(item)}
                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 active:bg-rose-100"
                      >
                        <Text className="text-xs">🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* RENAME MODAL */}
      <Modal
        visible={Boolean(editingSet)}
        transparent
        animationType="fade"
        onRequestClose={cancelRename}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-black/50 justify-center p-5"
        >
          <View className="w-full max-w-md mx-auto bg-white dark:bg-surface-darkSubtle p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl">
            <Text className="text-lg font-black text-slate-900 dark:text-slate-100 mb-1">
              Rename Study Set
            </Text>
            <Text className="text-xs text-slate-400 mb-5">
              Update the set title or subject category
            </Text>

            <Input
              label="Title"
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Enter new title..."
              containerClassName="mb-4"
            />

            <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Subject
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            >
              {DEFAULT_SUBJECTS.map((s) => (
                <Chip
                  key={s}
                  label={s}
                  selected={editSubject === s}
                  onPress={() => setEditSubject(s)}
                  size="sm"
                />
              ))}
            </ScrollView>

            <View className="flex-row gap-3">
              <Button
                label="Cancel"
                variant="ghost"
                size="md"
                className="flex-1"
                onPress={cancelRename}
              />
              <Button
                label="Save Changes"
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!editTitle.trim()}
                onPress={saveRename}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
