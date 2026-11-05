import { useState, useCallback, useMemo } from 'react';
import { Card, LeitnerBox } from '../types';
import { useSetStore, useStatsStore } from '../store';
import { calculateNextReviewDate, safeHaptics } from '../utils';

export type DeckFilterMode = 'all' | 'box1' | 'box2' | 'box3';

export interface UseFlashcardSessionProps {
  setId: string;
  initialCards: Card[];
}

export function useFlashcardSession({ setId, initialCards }: UseFlashcardSessionProps) {
  const updateCardBox = useSetStore((state) => state.updateCardBox);
  const toggleCardStarred = useSetStore((state) => state.toggleCardStarred);
  const recordSession = useStatsStore((state) => state.recordSession);

  const [filterMode, setFilterMode] = useState<DeckFilterMode>('all');
  const [cards, setCards] = useState<Card[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // New Study Modes: Reversed, Shuffled, Starred Only
  const [isReversed, setIsReversed] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<string[] | null>(null);
  const [starredOnly, setStarredOnly] = useState(false);
  const [highYieldOnly, setHighYieldOnly] = useState(false);

  // Session counters
  const [sessionReviewed, setSessionReviewed] = useState(0);
  const [sessionMastered, setSessionMastered] = useState(0);
  const [sessionNeedsReview, setSessionNeedsReview] = useState(0);

  // Sync internal deck if initialCards update from store (e.g. card added/edited)
  const syncCards = useCallback((updated: Card[]) => {
    setCards(updated);
  }, []);

  // Effective deck source (uses local session modifications or initial cards)
  const currentDeckSource = cards.length > 0 ? cards : initialCards;

  // Filter and arrange active deck
  const activeDeck = useMemo(() => {
    let pool = currentDeckSource;

    // Filter by box
    if (filterMode === 'box1') pool = pool.filter((c) => c.box === 1);
    else if (filterMode === 'box2') pool = pool.filter((c) => c.box === 2);
    else if (filterMode === 'box3') pool = pool.filter((c) => c.box === 3);

    // Filter by starred if active
    if (starredOnly) {
      pool = pool.filter((c) => c.starred);
    }

    // Filter by high-yield cram mode if active
    if (highYieldOnly) {
      pool = pool.filter((c) => c.highYield);
    }

    // Reorder deterministically using event-generated shuffle order
    if (isShuffled && shuffledOrder) {
      const orderMap = new Map(shuffledOrder.map((id, index) => [id, index]));
      pool = [...pool].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    }

    return pool;
  }, [currentDeckSource, filterMode, starredOnly, highYieldOnly, isShuffled, shuffledOrder]);

  const rawCard = activeDeck[currentIndex] as Card | undefined;

  // If in Reversed mode, question is answer, and answer is question!
  const currentCard = useMemo(() => {
    if (!rawCard) return undefined;
    if (isReversed) {
      return {
        ...rawCard,
        question: rawCard.answer,
        answer: rawCard.question,
      };
    }
    return rawCard;
  }, [rawCard, isReversed]);

  const totalCards = activeDeck.length;
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  // Leitner distribution in deck
  const deckStats = useMemo(() => {
    return {
      box1: currentDeckSource.filter((c) => c.box === 1).length,
      box2: currentDeckSource.filter((c) => c.box === 2).length,
      box3: currentDeckSource.filter((c) => c.box === 3).length,
      starred: currentDeckSource.filter((c) => c.starred).length,
    };
  }, [currentDeckSource]);

  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
    void safeHaptics('light');
  }, []);

  const toggleReversed = useCallback(() => {
    setIsReversed((prev) => !prev);
    setIsFlipped(false);
    void safeHaptics('light');
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffled((prev) => {
      const willShuffle = !prev;
      if (willShuffle) {
        const order = [...cards].sort(() => 0.5 - Math.random()).map((c) => c.id);
        setShuffledOrder(order);
      } else {
        setShuffledOrder(null);
      }
      return willShuffle;
    });
    setCurrentIndex(0);
    setIsFlipped(false);
    void safeHaptics('light');
  }, [cards]);

  const toggleStarredOnly = useCallback(() => {
    setStarredOnly((prev) => !prev);
    setCurrentIndex(0);
    setIsFlipped(false);
    void safeHaptics('light');
  }, []);

  const toggleHighYieldOnly = useCallback(() => {
    setHighYieldOnly((prev) => !prev);
    setCurrentIndex(0);
    setIsFlipped(false);
    void safeHaptics('light');
  }, []);

  const toggleStarCurrentCard = useCallback(() => {
    if (!rawCard) return;
    toggleCardStarred(setId, rawCard.id);
    setCards((prev) =>
      prev.map((c) =>
        c.id === rawCard.id ? { ...c, starred: !c.starred } : c
      )
    );
    void safeHaptics('light');
  }, [rawCard, setId, toggleCardStarred]);

  const finishSession = useCallback(
    (reviewed: number) => {
      setIsCompleted(true);
      const minutesSpent = Math.max(1, Math.round(reviewed * 0.5));
      recordSession(reviewed, minutesSpent);
      void safeHaptics('success');
    },
    [recordSession]
  );

  const advanceToNext = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex < activeDeck.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      finishSession(sessionReviewed + 1);
    }
  }, [currentIndex, activeDeck.length, finishSession, sessionReviewed]);

  const markGotIt = useCallback(() => {
    if (!rawCard) return;

    // Advance box: 1 -> 2 -> 3 -> 3
    let nextBox: LeitnerBox = 1;
    if (rawCard.box === 1) nextBox = 2;
    else if (rawCard.box === 2) nextBox = 3;
    else nextBox = 3;

    const nextReviewIso = calculateNextReviewDate(nextBox);

    // Update store
    updateCardBox(setId, rawCard.id, nextBox, nextReviewIso);

    // Update local deck
    setCards((prev) =>
      prev.map((c) =>
        c.id === rawCard.id
          ? { ...c, box: nextBox, nextReview: nextReviewIso }
          : c
      )
    );

    setSessionReviewed((prev) => prev + 1);
    setSessionMastered((prev) => prev + 1);
    void safeHaptics('success');

    advanceToNext();
  }, [rawCard, setId, updateCardBox, advanceToNext]);

  const markReviewAgain = useCallback(() => {
    if (!rawCard) return;

    // Demote back to Box 1
    const nextBox: LeitnerBox = 1;
    const nextReviewIso = calculateNextReviewDate(nextBox);

    // Update store
    updateCardBox(setId, rawCard.id, nextBox, nextReviewIso);

    // Update local deck
    setCards((prev) =>
      prev.map((c) =>
        c.id === rawCard.id
          ? { ...c, box: nextBox, nextReview: nextReviewIso }
          : c
      )
    );

    setSessionReviewed((prev) => prev + 1);
    setSessionNeedsReview((prev) => prev + 1);
    void safeHaptics('warning');

    advanceToNext();
  }, [rawCard, setId, updateCardBox, advanceToNext]);

  const prevCard = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      void safeHaptics('light');
    }
  }, [currentIndex]);

  const restartSession = useCallback(
    (newFilterMode: DeckFilterMode = 'all') => {
      setFilterMode(newFilterMode);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsCompleted(false);
      setSessionReviewed(0);
      setSessionMastered(0);
      setSessionNeedsReview(0);
      setStarredOnly(false);
      void safeHaptics('light');
    },
    []
  );

  return {
    cards: currentDeckSource,
    activeDeck,
    currentCard,
    rawCard,
    currentIndex,
    totalCards,
    progress,
    isFlipped,
    isCompleted,
    isReversed,
    isShuffled,
    starredOnly,
    highYieldOnly,
    deckStats,
    sessionReviewed,
    sessionMastered,
    sessionNeedsReview,
    filterMode,
    flipCard,
    markGotIt,
    markReviewAgain,
    prevCard,
    advanceToNext,
    restartSession,
    setFilterMode,
    toggleReversed,
    toggleShuffle,
    toggleStarredOnly,
    toggleHighYieldOnly,
    toggleStarCurrentCard,
    syncCards,
  };
}
