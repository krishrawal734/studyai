import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ScrollView,
  useWindowDimensions,
  Animated as RNAnimated,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LeitnerBox } from '../types';
import { speakText, stopSpeech, isSpeaking, safeHaptics } from '../utils';

export interface FlashCardProps {
  question: string;
  answer: string;
  box: LeitnerBox;
  isFlipped: boolean;
  starred?: boolean;
  onFlip: () => void;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onToggleStar?: () => void;
  onEdit?: () => void;
  className?: string;
}

const boxConfig: Record<
  LeitnerBox,
  { label: string; badge: string; text: string; nextReview: string }
> = {
  1: {
    label: 'Box 1 · Daily',
    badge: 'bg-rose-100 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900',
    text: 'text-rose-700 dark:text-rose-300',
    nextReview: 'Reviews daily until remembered',
  },
  2: {
    label: 'Box 2 · 3 Days',
    badge: 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900',
    text: 'text-amber-700 dark:text-amber-300',
    nextReview: 'Reviews every 3 days',
  },
  3: {
    label: 'Box 3 · Mastered (7d)',
    badge: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900',
    text: 'text-emerald-700 dark:text-emerald-300',
    nextReview: 'Reviews every 7 days',
  },
};

const SWIPE_THRESHOLD = 110;

export const FlashCard: React.FC<FlashCardProps> = ({
  question,
  answer,
  box,
  isFlipped,
  starred = false,
  onFlip,
  onSwipeRight,
  onSwipeLeft,
  onToggleStar,
  onEdit,
  className = '',
}) => {
  const { height: windowHeight } = useWindowDimensions();
  const dynamicHeight = Math.min(420, Math.max(280, Math.round((windowHeight || 700) * 0.44)));

  const currentBox = boxConfig[box] ?? boxConfig[1];
  const rotateValue = useSharedValue(isFlipped ? 180 : 0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Pan gesture tracking for Tinder/Anki swipe
  const [panX] = useState(() => new RNAnimated.Value(0));
  const [dragDirection, setDragDirection] = useState<'right' | 'left' | null>(null);

  const [panRotation] = useState(() =>
    panX.interpolate({
      inputRange: [-250, 0, 250],
      outputRange: ['-14deg', '0deg', '14deg'],
      extrapolate: 'clamp',
    })
  );

  useEffect(() => {
    rotateValue.value = withTiming(isFlipped ? 180 : 0, { duration: 320 });
    void stopSpeech();
  }, [isFlipped, rotateValue]);

  useEffect(() => {
    return () => {
      void stopSpeech();
    };
  }, []);

  // PanResponder for physical card swiping
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => {
          return Math.abs(gesture.dx) > 12 && Math.abs(gesture.dy) < 30;
        },
        onPanResponderMove: (_, gesture) => {
          panX.setValue(gesture.dx);
          if (gesture.dx > 40) {
            setDragDirection('right');
          } else if (gesture.dx < -40) {
            setDragDirection('left');
          } else {
            setDragDirection(null);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > SWIPE_THRESHOLD && onSwipeRight) {
            RNAnimated.timing(panX, {
              toValue: 500,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              panX.setValue(0);
              setDragDirection(null);
              onSwipeRight();
            });
          } else if (gesture.dx < -SWIPE_THRESHOLD && onSwipeLeft) {
            RNAnimated.timing(panX, {
              toValue: -500,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              panX.setValue(0);
              setDragDirection(null);
              onSwipeLeft();
            });
          } else {
            // Snap back to center
            RNAnimated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 8,
            }).start(() => setDragDirection(null));
          }
        },
      }),
    [onSwipeRight, onSwipeLeft, panX]
  );

  // Front animated style (0 -> 180 deg)
  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotateValue.value, [0, 180], [0, 180]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity: rotateValue.value <= 90 ? 1 : 0,
      zIndex: rotateValue.value <= 90 ? 2 : 1,
    };
  });

  // Back animated style (180 -> 360 deg)
  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateY = interpolate(rotateValue.value, [0, 180], [180, 360]);
    return {
      transform: [{ perspective: 1000 }, { rotateY: `${rotateY}deg` }],
      opacity: rotateValue.value > 90 ? 1 : 0,
      zIndex: rotateValue.value > 90 ? 2 : 1,
    };
  });

  const handleCardFlip = () => {
    if (isPlayingAudio) {
      void stopSpeech();
      setIsPlayingAudio(false);
    }
    onFlip();
  };

  const handleAudio = async (e?: React.SyntheticEvent) => {
    e?.stopPropagation?.();
    void safeHaptics('light');

    const activeSpeech = await isSpeaking();
    if (activeSpeech || isPlayingAudio) {
      await stopSpeech();
      setIsPlayingAudio(false);
      return;
    }

    const textToSpeak = isFlipped ? answer : question;
    setIsPlayingAudio(true);
    await speakText(textToSpeak, () => setIsPlayingAudio(false));
  };

  const handleStar = (e?: React.SyntheticEvent) => {
    e?.stopPropagation?.();
    void safeHaptics('light');
    onToggleStar?.();
  };

  const handleEdit = (e?: React.SyntheticEvent) => {
    e?.stopPropagation?.();
    void safeHaptics('light');
    onEdit?.();
  };

  return (
    <View style={[styles.cardWrapper, { height: dynamicHeight }]} className={className}>
      <RNAnimated.View
        {...panResponder.panHandlers}
        style={[
          styles.cardContainer,
          {
            transform: [{ translateX: panX }, { rotate: panRotation }],
          },
        ]}
      >
        {/* Swipe Feedback Overlay Badges */}
        {dragDirection === 'right' && (
          <View className="absolute top-8 left-6 z-30 bg-emerald-500 px-3.5 py-1.5 rounded-2xl border-2 border-white shadow-lg pointer-events-none">
            <Text className="text-sm font-black text-white uppercase tracking-wider">
              GOT IT ✓
            </Text>
          </View>
        )}
        {dragDirection === 'left' && (
          <View className="absolute top-8 right-6 z-30 bg-rose-500 px-3.5 py-1.5 rounded-2xl border-2 border-white shadow-lg pointer-events-none">
            <Text className="text-sm font-black text-white uppercase tracking-wider">
              REVIEW AGAIN ⚡
            </Text>
          </View>
        )}

        {/* FRONT SIDE (Question) */}
        <Animated.View
          pointerEvents={isFlipped ? 'none' : 'auto'}
          style={[styles.cardAbsolute, frontAnimatedStyle]}
          className="bg-white dark:bg-surface-darkSubtle rounded-3xl p-6 border-2 border-slate-200/90 dark:border-slate-800 shadow-md justify-between"
        >
          {/* Top Header - Independent actions (not inside flip button) */}
          <View className="flex-row justify-between items-center mb-1">
            <View className={`px-2.5 py-1 rounded-full border ${currentBox.badge}`}>
              <Text className={`text-[11px] font-bold ${currentBox.text}`}>
                {currentBox.label}
              </Text>
            </View>

            {/* Actions: Audio, Star, Edit */}
            <View className="flex-row items-center gap-1">
              {Boolean(onEdit) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Edit flashcard"
                  onPress={() => handleEdit()}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <Text className="text-xs">✏️</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isPlayingAudio ? 'Stop audio' : 'Listen to question'}
                onPress={() => handleAudio()}
                className={`p-1.5 rounded-full ${
                  isPlayingAudio ? 'bg-primary-600' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <Text className="text-xs">{isPlayingAudio ? '🔊' : '🔈'}</Text>
              </TouchableOpacity>

              {Boolean(onToggleStar) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={starred ? 'Starred card' : 'Star this card'}
                  onPress={() => handleStar()}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <Text className="text-xs">{starred ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              )}

              <View className="flex-row items-center gap-1 ml-1.5">
                <Text className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Q
                </Text>
                <View className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
              </View>
            </View>
          </View>

          {/* Question & Flip Body */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Flashcard question: ${question}. Tap to flip to answer.`}
            activeOpacity={0.92}
            onPress={handleCardFlip}
            className="flex-1 justify-between"
          >
            {/* Question Text */}
            <View className="py-4 items-center justify-center flex-1">
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text className="text-center font-bold text-slate-900 dark:text-slate-100 text-lg md:text-xl leading-relaxed">
                  {question}
                </Text>
              </ScrollView>
            </View>

            {/* Footer Hint */}
            <View className="items-center pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <Text className="text-[11px] font-semibold text-primary-600 dark:text-primary-400">
                👆 Tap to flip · 👈 Swipe left (Review) · Swipe right (Got it) 👉
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* BACK SIDE (Answer) */}
        <Animated.View
          pointerEvents={isFlipped ? 'auto' : 'none'}
          style={[styles.cardAbsolute, backAnimatedStyle]}
          className="bg-primary-50/40 dark:bg-slate-900 rounded-3xl p-6 border-2 border-primary-400 dark:border-primary-600 shadow-lg justify-between"
        >
          {/* Top Header - Independent actions (not inside flip button) */}
          <View className="flex-row justify-between items-center mb-1">
            <View className={`px-2.5 py-1 rounded-full border ${currentBox.badge}`}>
              <Text className={`text-[11px] font-bold ${currentBox.text}`}>
                {currentBox.label}
              </Text>
            </View>

            {/* Actions: Audio, Star, Edit */}
            <View className="flex-row items-center gap-1">
              {Boolean(onEdit) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Edit flashcard"
                  onPress={() => handleEdit()}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <Text className="text-xs">✏️</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={isPlayingAudio ? 'Stop audio' : 'Listen to answer'}
                onPress={() => handleAudio()}
                className={`p-1.5 rounded-full ${
                  isPlayingAudio ? 'bg-primary-600' : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <Text className="text-xs">{isPlayingAudio ? '🔊' : '🔈'}</Text>
              </TouchableOpacity>

              {Boolean(onToggleStar) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={starred ? 'Starred card' : 'Star this card'}
                  onPress={() => handleStar()}
                  className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <Text className="text-xs">{starred ? '⭐' : '☆'}</Text>
                </TouchableOpacity>
              )}

              <View className="flex-row items-center gap-1 ml-1.5">
                <Text className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">
                  A
                </Text>
                <View className="w-2 h-2 rounded-full bg-primary-600" />
              </View>
            </View>
          </View>

          {/* Answer & Flip Body */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Flashcard answer: ${answer}. Tap to flip to question.`}
            activeOpacity={0.92}
            onPress={handleCardFlip}
            className="flex-1 justify-between"
          >
            {/* Answer Text */}
            <View className="py-4 items-center justify-center flex-1">
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text className="text-center font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg leading-relaxed">
                  {answer}
                </Text>
              </ScrollView>
            </View>

            {/* Footer Hint */}
            <View className="items-center pt-2 border-t border-primary-100 dark:border-slate-800">
              <Text className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                🔄 Tap to flip · 👈 Swipe to Review · Swipe to Advance 👉
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </RNAnimated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: '100%',
    height: 380,
    position: 'relative',
  },
  cardContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  cardAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
});
