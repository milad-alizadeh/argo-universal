import { useEffect, useRef, type ReactElement } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  ReduceMotion,
} from 'react-native-reanimated';
import { bezierEasing } from '#lib/generic/bezier-easing';
import type { FrameMotion } from '../utils/frame-timing';

export interface BandTitleLeadingProps extends FrameMotion {
  width: number;
}

function targetWidth(props: BandTitleLeadingProps, previous: string): number {
  if (!props.animate || previous === props.transitionKey) return props.width;

  return withTiming(props.width, {
    duration: props.timing.duration,
    easing: bezierEasing(props.timing.curve),
    reduceMotion: ReduceMotion.System,
  });
}

function useLeadingWidth(
  props: BandTitleLeadingProps,
): ReturnType<typeof useSharedValue<number>> {
  const { width: target, transitionKey, animate, timing } = props;
  const width = useSharedValue(target);
  const previous = useRef(transitionKey);
  useEffect(() => {
    const next = { width: target, transitionKey, animate, timing };
    width.set(targetWidth(next, previous.current));
    previous.current = transitionKey;
  }, [target, transitionKey, animate, timing, width]);

  return width;
}

export function BandTitleLeading(props: BandTitleLeadingProps): ReactElement {
  const width = useLeadingWidth(props);
  const style = useAnimatedStyle(() => ({ width: width.get() }));

  return (
    <Animated.View
      testID="band-title-leading"
      className="shrink-0"
      style={style}
    />
  );
}
