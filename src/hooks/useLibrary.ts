import { useState, useMemo, useCallback } from 'react';
import { useSetStore } from '../store';
import { StudySet } from '../types';
import { safeHaptics, safeAlert } from '../utils';

export type SortOption = 'newest' | 'oldest' | 'alphabetical' | 'cards';

export function useLibrary() {
  const sets = useSetStore((state) => state.sets);
  const updateSet = useSetStore((state) => state.updateSet);
  const deleteSet = useSetStore((state) => state.deleteSet);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Rename modal state
  const [editingSet, setEditingSet] = useState<StudySet | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');

  // Subject counts
  const subjectCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of (sets || [])) {
      if (s?.subject) {
        counts[s.subject] = (counts[s.subject] || 0) + 1;
      }
    }
    return counts;
  }, [sets]);

  // Filtered and sorted sets
  const filteredSets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const result = (sets || []).filter((s) => {
      const cards = s?.cards || [];
      const matchesSearch =
        !query ||
        s.title.toLowerCase().includes(query) ||
        s.summary.toLowerCase().includes(query) ||
        s.subject.toLowerCase().includes(query) ||
        cards.some(
          (c) =>
            c.question.toLowerCase().includes(query) ||
            c.answer.toLowerCase().includes(query)
        );

      const matchesSubject = !selectedSubject || s.subject === selectedSubject;

      return matchesSearch && matchesSubject;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'cards') {
        return b.cards.length - a.cards.length;
      }
      return 0;
    });
  }, [sets, searchQuery, selectedSubject, sortBy]);

  // Rename flow
  const startRename = useCallback((set: StudySet) => {
    setEditingSet(set);
    setEditTitle(set.title);
    setEditSubject(set.subject);
    void safeHaptics('light');
  }, []);

  const cancelRename = useCallback(() => {
    setEditingSet(null);
    setEditTitle('');
    setEditSubject('');
  }, []);

  const saveRename = useCallback(() => {
    if (!editingSet) return;
    const trimmed = editTitle.trim();
    if (!trimmed) {
      safeAlert('Invalid Title', 'Please enter a valid title for the study set.');
      return;
    }

    updateSet(editingSet.id, {
      title: trimmed,
      subject: editSubject || editingSet.subject,
    });

    void safeHaptics('success');
    setEditingSet(null);
  }, [editingSet, editTitle, editSubject, updateSet]);

  // Delete flow with confirmation dialog
  const promptDelete = useCallback(
    (set: StudySet) => {
      void safeHaptics('warning');
      safeAlert(
        'Delete Study Set?',
        `Are you sure you want to permanently delete "${set.title}"? All associated flashcards and quizzes will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteSet(set.id);
              void safeHaptics('error');
            },
          },
        ]
      );
    },
    [deleteSet]
  );

  return {
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
  };
}
