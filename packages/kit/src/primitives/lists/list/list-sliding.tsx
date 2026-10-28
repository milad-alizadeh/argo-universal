import { useEffect, type ReactNode } from 'react';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { motionDuration } from '../../../motion';

const slideTiming = {
  duration: motionDuration.exit,
  reduceMotion: ReduceMotion.System,
};

// How far a row or Section header moves aside, by its key, while a row is dragged; none where rows do not slide apart.
export const slideOf = <Key,>(
  slides: ReadonlyMap<Key, number> | undefined,
  key: Key,
): number => slides?.get(key) ?? 0;

interface SlidingProps {
  offset: number;
  className?: string;
  children: ReactNode;
}

// Moves aside while another row is dragged past it, where rows slide apart.
function useSlide(offset: number): ReturnType<typeof useAnimatedStyle> {
  const slid = useSharedValue(offset);

  // The style stays one worklet; only a new offset starts a slide.
  useEffect(() => slid.set(withTiming(offset, slideTiming)), [slid, offset]);

  return useAnimatedStyle(() => ({
    transform: [{ translateY: slid.get() }],
  }));
}

export function Sliding({
  offset,
  className,
  children,
}: SlidingProps): ReactNode {
  const style = useSlide(offset);

  return (
    <Animated.View className={className} style={style}>
      {children}
    </Animated.View>
  );
}
