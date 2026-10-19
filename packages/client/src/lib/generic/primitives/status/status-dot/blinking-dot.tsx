import type * as React from 'react';
import { useEffect, useMemo } from 'react';
import type { BoxShadowValue, ColorValue, ViewStyle } from 'react-native';
import Animated, {
  type SharedValue,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/generic/utils';

const dimmedOpacity = 0.45;

const blinkMilliseconds = 650;

export interface BlinkingDotProps {
  // A background class such as `bg-warning`; the glow takes the same colour.
  colorClassName: string;
  blinking?: boolean;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
}

// A status dot that blinks and glows while something is live or waits on you.
export function BlinkingDot({
  colorClassName,
  blinking = true,
  className,
  testID,
  accessibilityLabel,
}: BlinkingDotProps): React.JSX.Element {
  const style = useBlinkingStyle(colorClassName, blinking);

  return (
    <AnimatedDotView
      props={{ colorClassName, testID, accessibilityLabel, style, className }}
    />
  );
}

function AnimatedDotView({
  props,
}: {
  props: BlinkingDotProps & {
    style: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  };
}): React.JSX.Element {
  return <Animated.View {...animatedDotProps(props)} />;
}

function animatedDotProps(
  props: BlinkingDotProps & {
    style: ReturnType<typeof useAnimatedStyle<ViewStyle>>;
  },
): React.ComponentProps<typeof Animated.View> {
  return {
    testID: props.testID,
    accessible: !!props.accessibilityLabel,
    accessibilityRole: props.accessibilityLabel ? 'image' : undefined,
    accessibilityLabel: props.accessibilityLabel,
    style: props.style,
    className: cn('rounded-full', props.colorClassName, props.className),
  };
}

function useBlinkingStyle(
  colorClassName: string,
  blinking: boolean,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const { backgroundColor } = useResolveClassNames(colorClassName);
  const opacity = useBlinkingOpacity(blinking);

  const boxShadow = useMemo(
    () => glowShadow(backgroundColor, blinking),
    [backgroundColor, blinking],
  );

  return useAnimatedStyle(
    () => ({ opacity: opacity.get(), boxShadow }),
    [opacity, boxShadow],
  );
}

function useBlinkingOpacity(blinking: boolean): SharedValue<number> {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(blinking ? blink() : 1);

    return (): void => cancelAnimation(opacity);
  }, [blinking, opacity]);

  return opacity;
}

function blink(): number {
  return withRepeat(
    withTiming(dimmedOpacity, { duration: blinkMilliseconds }),
    -1,
    true,
  );
}

function glowShadow(
  color: ColorValue | undefined,
  blinking: boolean,
): BoxShadowValue[] {
  if (!blinking) return [];

  return [{ offsetX: 0, offsetY: 0, blurRadius: 4, spreadDistance: 0, color }];
}
