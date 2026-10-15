import type * as React from 'react';
import { type ReactNode, useEffect, useRef } from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { bezierEasing } from '#lib/generic/bezier-easing';
import { easingCurve, motionDuration } from '#lib/generic/motion';
import { useStableContentWidth } from './stable-content-width';

export interface FramePaneProps {
  testID: string;
  width: number;
  offset: number;
  contentWidth?: number;
  hidden: boolean;
  transitionKey: string;
  animate?: boolean;
  children: ReactNode;
}

type PaneWidthProps = Pick<
  FramePaneProps,
  'width' | 'transitionKey' | 'animate'
>;

type PaneContentProps = Pick<
  FramePaneProps,
  'testID' | 'width' | 'contentWidth' | 'children'
>;

interface HiddenPaneProps extends ViewProps {
  inert: boolean;
}

function timedWidth(width: number): number {
  return withTiming(width, {
    duration: motionDuration.framePane,
    easing: bezierEasing(easingCurve.decelerate),
    reduceMotion: ReduceMotion.System,
  });
}

function useWidthTransition(
  animatedWidth: SharedValue<number>,
  { width, transitionKey, animate = true }: PaneWidthProps,
): void {
  const previousTransition = useRef(transitionKey);
  useEffect(() => {
    const moves = animate && previousTransition.current !== transitionKey;
    animatedWidth.set(moves ? timedWidth(width) : width);
    previousTransition.current = transitionKey;
  }, [animatedWidth, width, transitionKey, animate]);
}

function useAnimatedWidth(
  props: PaneWidthProps,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const animatedWidth = useSharedValue(props.width);
  useWidthTransition(animatedWidth, props);

  return useAnimatedStyle<ViewStyle>(
    () => ({ width: animatedWidth.get() }),
    [animatedWidth],
  );
}

function hiddenPaneProps(hidden: boolean): HiddenPaneProps {
  return {
    className: hidden
      ? 'min-w-0 shrink-0 pointer-events-none'
      : 'min-w-0 shrink-0 pointer-events-auto',
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden ? 'no-hide-descendants' : 'auto',
    'aria-hidden': hidden,
    inert: hidden,
  };
}

function PaneContent(props: PaneContentProps): React.JSX.Element {
  const width = useStableContentWidth(props.width, props.contentWidth);

  return (
    <View
      testID={`${props.testID}-content`}
      className="flex-1"
      style={{ width }}
    >
      {props.children}
    </View>
  );
}

export function FramePane(props: FramePaneProps): React.JSX.Element {
  const animatedStyle = useAnimatedWidth(props);

  return (
    <Animated.View
      testID={props.testID}
      style={animatedStyle}
      {...hiddenPaneProps(props.hidden)}
    >
      <View className="flex-1 overflow-hidden">
        <PaneContent {...props} />
      </View>
    </Animated.View>
  );
}
