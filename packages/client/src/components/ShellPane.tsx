import { type ReactNode, useEffect, useRef } from 'react';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

interface ShellPaneProps {
  testID: string;
  width: number;
  hidden: boolean;
  transitionKey: string;
  children: ReactNode;
}

export function ShellPane({
  testID,
  width,
  hidden,
  transitionKey,
  children,
}: ShellPaneProps) {
  const animatedWidth = useSharedValue(width);
  const previousTransition = useRef(transitionKey);
  useEffect(() => {
    animatedWidth.value =
      previousTransition.current === transitionKey
        ? width
        : withTiming(width, {
            duration: 280,
            easing: Easing.bezier(0.22, 1, 0.36, 1),
            reduceMotion: ReduceMotion.System,
          });
    previousTransition.current = transitionKey;
  }, [animatedWidth, width, transitionKey]);
  const animatedStyle = useAnimatedStyle(
    () => ({
      width: animatedWidth.value,
    }),
    [animatedWidth],
  );
  return (
    <Animated.View
      testID={testID}
      className="min-w-0 shrink-0"
      style={animatedStyle}
      pointerEvents={hidden ? 'none' : 'auto'}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      aria-hidden={hidden}
      {...{ inert: hidden }}
    >
      {children}
    </Animated.View>
  );
}
