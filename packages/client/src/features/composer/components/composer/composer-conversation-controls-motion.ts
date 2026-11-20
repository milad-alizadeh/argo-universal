import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import { motionDuration } from '@repo/kit/motion';
import { useReducedMotionNow } from '@repo/kit/use-reduced-motion-now';
import { useCallback, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  runOnJS,
  type SharedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import {
  always,
  type AnimatedStyle,
  controlIn,
  decelerate,
  standard,
  useControlStyle,
} from './composer-conversation-motion';

// Lengths and delays of the in-call controls' moves, in milliseconds.
const move = {
  room: 260,
  // The speaker follows the microphone in.
  stagger: 70,
  roomOutDelay: 60,
  roomOut: 200,
};

// The row's gap beside the mutes, `gap-2.5`, which the closed room gives back.
const rowGap = 10;

interface ControlValues {
  open: SharedValue<number>;
  first: SharedValue<number>;
  second: SharedValue<number>;
  still: boolean;
}

export interface CallControlsMotion {
  room: AnimatedStyle;
  // One style per control, in order: each comes in a beat after the one before.
  controls: [AnimatedStyle, AnimatedStyle];
  measure: (event: LayoutChangeEvent) => void;
}

// The mutes' room in the row is their measured width times how far it has opened; open, it takes its own width again.
function useRoomStyle(
  open: SharedValue<number>,
  width: SharedValue<number>,
): AnimatedStyle {
  return useAnimatedStyle(() => {
    const shown = open.get();
    const settled = shown >= 1;

    return {
      width: settled ? 'auto' : width.get() * shown,
      marginRight: -rowGap * (1 - shown),
      overflow: settled ? 'visible' : 'hidden',
    };
  }, [open, width]);
}

const roomIn = (still: boolean): number =>
  still
    ? 1
    : withTiming(1, {
        duration: move.room,
        easing: decelerate,
        reduceMotion: always,
      });

function comeIn({ open, first, second, still }: ControlValues): void {
  open.set(roomIn(still));
  first.set(controlIn(still));
  second.set(withDelay(still ? 0 : move.stagger, controlIn(still), always));
}

const fadeOut = { duration: motionDuration.exit, easing: standard };

// The controls fade together, then the room closes; under reduced motion it closes in one step once they have.
function roomOut(still: boolean, onGone: () => void): number {
  const room = { ...fadeOut, duration: still ? 0 : move.roomOut };

  const gone = (finished?: boolean): void => {
    'worklet';

    if (finished) runOnJS(onGone)();
  };

  return withDelay(
    still ? motionDuration.exit : move.roomOutDelay,
    withTiming(0, { ...room, reduceMotion: always }, gone),
    always,
  );
}

function goOut(values: ControlValues, onGone: () => void): void {
  values.first.set(withTiming(0, { ...fadeOut, reduceMotion: always }));
  values.second.set(withTiming(0, { ...fadeOut, reduceMotion: always }));
  values.open.set(roomOut(values.still, onGone));
}

function useControlValues(): ControlValues {
  const still = useReducedMotionNow();
  const open = useSharedValue(0);
  const first = useSharedValue(0);
  const second = useSharedValue(0);

  return useMemo(
    () => ({ open, first, second, still }),
    [open, first, second, still],
  );
}

function usePlayControls(
  values: ControlValues,
  leaving: boolean,
  onGone: () => void,
): void {
  useEffect(() => {
    if (leaving) goOut(values, onGone);
    else comeIn(values);
  }, [leaving, values, onGone]);
}

function useMeasure(width: SharedValue<number>): CallControlsMotion['measure'] {
  return useCallback(
    (event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width),
    [width],
  );
}

/*
 * The microphone and speaker coming in beside End once the call connects: their room in the row opens over 260ms as
 * each springs in, the speaker 70ms after the microphone, and once the call ends they fade and the room closes,
 * calling `onGone`.
 */
export function useCallControlsMotion(
  leaving: boolean,
  onGone: () => void,
): CallControlsMotion {
  const values = useControlValues();
  const { open, first, second, still } = values;
  const width = useSharedValue(0);
  usePlayControls(values, leaving, onGone);

  return {
    room: useRoomStyle(open, width),
    controls: [useControlStyle(first, still), useControlStyle(second, still)],
    measure: useMeasure(width),
  };
}
