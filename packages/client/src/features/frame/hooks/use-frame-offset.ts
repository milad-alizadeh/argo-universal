import { bezierEasing } from '@repo/kit/bezier-easing';
import { useLayoutEffect, useRef } from 'react';
import type { ViewStyle } from 'react-native';
import {
  ReduceMotion,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { FrameMotion } from '../utils/frame-timing';

type OffsetMotion = FrameMotion & {
  offset: number;
  visible: boolean;
  // A replacement view cannot travel across the primary content it hides or restores.
  replacesPrimary?: boolean;
};

type MotionValues = {
  shift: SharedValue<number>;
  opacity: SharedValue<number>;
};

function timed(value: number, next: OffsetMotion): number {
  return withTiming(value, {
    duration: next.timing.duration,
    easing: bezierEasing(next.timing.curve),
    reduceMotion: ReduceMotion.System,
  });
}

function reset(values: MotionValues, next: OffsetMotion): void {
  values.shift.set(0);
  values.opacity.set(Number(next.visible));
}

const canTravel = (next: OffsetMotion, last: OffsetMotion): boolean =>
  next.animate && !next.replacesPrimary && !last.replacesPrimary;

function move(
  values: MotionValues,
  next: OffsetMotion,
  last: OffsetMotion,
): void {
  if (!canTravel(next, last)) return reset(values, next);

  values.shift.set(values.shift.get() + last.offset - next.offset);
  values.shift.set(timed(0, next));
  values.opacity.set(timed(Number(next.visible), next));
}

function sync(
  values: MotionValues,
  next: OffsetMotion,
  last: OffsetMotion,
): void {
  if (next.transitionKey !== last.transitionKey)
    return move(values, next, last);

  // A resize moves immediately; an unrelated render leaves an ongoing motion alone.
  if (next.offset !== last.offset) reset(values, next);
}

function useOffsetValues(props: OffsetMotion): MotionValues {
  const shift = useSharedValue(0);
  const opacity = useSharedValue(Number(props.visible));
  const previous = useRef(props);
  useLayoutEffect(() => {
    sync({ shift, opacity }, props, previous.current);
    previous.current = props;
  }, [props, shift, opacity]);

  return { shift, opacity };
}

// Take the destination layout immediately, then translate from the current visual position.
export function useFrameOffset(
  props: OffsetMotion,
): ReturnType<typeof useAnimatedStyle<ViewStyle>> {
  const { shift, opacity } = useOffsetValues(props);

  return useAnimatedStyle<ViewStyle>(
    () => ({
      transform: [{ translateX: shift.get() }],
      opacity: opacity.get(),
    }),
    [shift, opacity],
  );
}
