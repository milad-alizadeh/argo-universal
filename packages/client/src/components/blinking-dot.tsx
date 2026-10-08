import type * as React from 'react';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';

const dimmedOpacity = 0.45;
const blinkMilliseconds = 650;

export interface BlinkingDotProps {
  // A background class such as `bg-warning`; the glow takes the same colour.
  colorClassName: string;
  blinking?: boolean;
  className?: string;
  testID?: string;
}

// A status dot that blinks and glows while something is live or waits on you.
export function BlinkingDot({
  colorClassName,
  blinking = true,
  className,
  testID,
}: BlinkingDotProps): React.JSX.Element {
  const { backgroundColor } = useResolveClassNames(colorClassName);
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(
      blinking
        ? withRepeat(
            withTiming(dimmedOpacity, { duration: blinkMilliseconds }),
            -1,
            true,
          )
        : 1,
    );
    return (): void => cancelAnimation(opacity);
  }, [blinking, opacity]);
  const style = useAnimatedStyle(
    () => ({
      opacity: opacity.get(),
      boxShadow: blinking
        ? [
            {
              offsetX: 0,
              offsetY: 0,
              blurRadius: 4,
              spreadDistance: 0,
              color: backgroundColor,
            },
          ]
        : [],
    }),
    [opacity, blinking, backgroundColor],
  );
  return (
    <Animated.View
      testID={testID}
      style={style}
      className={cn('rounded-full', colorClassName, className)}
    />
  );
}
