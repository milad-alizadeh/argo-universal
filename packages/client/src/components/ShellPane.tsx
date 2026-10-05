import { type ReactNode, useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export interface ShellPaneProps {
  testID: string;
  width: number;
  offset: number;
  contentWidth?: number;
  card?: boolean;
  overlay?: ReactNode;
  hidden: boolean;
  transitionKey: string;
  children: ReactNode;
}

export function ShellPane({
  testID,
  width,
  contentWidth,
  card,
  hidden,
  transitionKey,
  overlay,
  children,
}: ShellPaneProps) {
  const lastContentWidth = useRef(contentWidth ?? width);
  const stableContentWidth =
    contentWidth ?? (width > 0 ? width : lastContentWidth.current);
  useEffect(() => {
    lastContentWidth.current = stableContentWidth;
  }, [stableContentWidth]);
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
      {card && (
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 right-0 top-shell-bar rounded-xl bg-card shadow-card"
        />
      )}
      <View className="flex-1 overflow-hidden">
        <View
          testID={`${testID}-content`}
          className="flex-1"
          style={{ width: stableContentWidth }}
        >
          {children}
        </View>
      </View>
      {overlay}
    </Animated.View>
  );
}
