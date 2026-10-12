import type * as React from 'react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { bezierEasing, easingCurve, motionDuration } from '#lib/generic/motion';

export interface ShellPaneProps {
  testID: string;
  width: number;
  offset: number;
  contentWidth?: number;
  hidden: boolean;
  transitionKey: string;
  animate?: boolean;
  children: ReactNode;
}

export function ShellPane({
  testID,
  width,
  contentWidth,
  hidden,
  transitionKey,
  animate = true,
  children,
}: ShellPaneProps): React.JSX.Element {
  const [lastContentWidth, setLastContentWidth] = useState(
    contentWidth ?? width,
  );
  const stableContentWidth =
    contentWidth ?? (width > 0 ? width : lastContentWidth);
  if (lastContentWidth !== stableContentWidth)
    setLastContentWidth(stableContentWidth);
  const animatedWidth = useSharedValue(width);
  const previousTransition = useRef(transitionKey);
  useEffect(() => {
    animatedWidth.set(
      !animate || previousTransition.current === transitionKey
        ? width
        : withTiming(width, {
            duration: motionDuration.shellPane,
            easing: bezierEasing(easingCurve.decelerate),
            reduceMotion: ReduceMotion.System,
          }),
    );
    previousTransition.current = transitionKey;
  }, [animatedWidth, width, transitionKey, animate]);
  const animatedStyle = useAnimatedStyle(
    () => ({
      width: animatedWidth.get(),
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
      <View className="flex-1 overflow-hidden">
        <View
          testID={`${testID}-content`}
          className="flex-1"
          style={{ width: stableContentWidth }}
        >
          {children}
        </View>
      </View>
    </Animated.View>
  );
}
