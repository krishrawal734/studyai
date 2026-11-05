import React, { useEffect, useState } from 'react';
import { View, Animated, ViewProps } from 'react-native';

export interface LoadingSkeletonProps extends ViewProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 12,
  className = '',
  style,
  ...rest
}) => {
  const [opacity] = useState(() => new Animated.Value(0.3));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as unknown as number,
          height: height as unknown as number,
          borderRadius,
          opacity,
        },
        style,
      ]}
      className={`bg-slate-200 dark:bg-slate-700 ${className}`}
      {...rest}
    />
  );
};

export const StudySetSkeleton: React.FC = () => {
  return (
    <View className="bg-white dark:bg-surface-darkSubtle p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <LoadingSkeleton width={70} height={20} borderRadius={10} />
        <LoadingSkeleton width={90} height={16} borderRadius={8} />
      </View>
      <LoadingSkeleton width="75%" height={22} borderRadius={8} className="mb-2" />
      <LoadingSkeleton width="100%" height={14} borderRadius={6} className="mb-1.5" />
      <LoadingSkeleton width="85%" height={14} borderRadius={6} />
    </View>
  );
};
