import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions, Platform } from 'react-native';

const CONFETTI_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  animY: Animated.Value;
  animRotate: Animated.Value;
  animOpacity: Animated.Value;
}

interface ConfettiBurstProps {
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

function ConfettiBurst({
  count = 35,
  duration = 2400,
  onComplete,
}: ConfettiBurstProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const safeWidth = screenWidth || 360;
  const safeHeight = screenHeight || 640;

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [particles] = useState<Particle[]>(() => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: Math.random() * safeWidth,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: Math.random() * 6 + 6,
        animY: new Animated.Value(0),
        animRotate: new Animated.Value(0),
        animOpacity: new Animated.Value(1),
      });
    }
    return list;
  });

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];

    particles.forEach((p, idx) => {
      p.animY.setValue(-30);
      p.animRotate.setValue(0);
      p.animOpacity.setValue(1);

      const delay = (idx % 10) * 40;
      const targetY = safeHeight * (0.6 + Math.random() * 0.4);

      animations.push(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(p.animY, {
              toValue: targetY,
              duration: duration - delay,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(p.animRotate, {
              toValue: Math.random() * 8 - 4,
              duration: duration - delay,
              useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.timing(p.animOpacity, {
              toValue: 0,
              duration: duration - delay,
              delay: (duration - delay) * 0.65,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ])
      );
    });

    const composite = Animated.parallel(animations);
    composite.start(() => {
      onCompleteRef.current?.();
    });

    return () => {
      composite.stop();
    };
  }, [duration, particles, safeHeight]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => {
        const rotate = p.animRotate.interpolate({
          inputRange: [-4, 4],
          outputRange: ['-360deg', '360deg'],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                width: p.size,
                height: p.size * (p.id % 2 === 0 ? 1.6 : 1),
                backgroundColor: p.color,
                borderRadius: p.id % 3 === 0 ? p.size / 2 : 2,
                transform: [{ translateY: p.animY }, { rotate }],
                opacity: p.animOpacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export interface ConfettiProps {
  active: boolean;
  count?: number;
  duration?: number;
  onComplete?: () => void;
}

export function Confetti({ active, count, duration, onComplete }: ConfettiProps) {
  if (!active) return null;
  return (
    <ConfettiBurst
      count={count}
      duration={duration}
      onComplete={onComplete}
    />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
    zIndex: 9999,
  },
});
