import { IconSlot } from '@repo/kit/primitives/content/icon';
import type * as React from 'react';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const stepMilliseconds = 150;

const fadeMilliseconds = 400;

const fadeSteps = fadeMilliseconds / stepMilliseconds;

const restingOpacity = 0.18;

// Cell offsets in px along either axis.
const near = 2;

const middle = 6.3;

const far = 10.6;

// Cells clockwise round the edge from top left, then the centre.
const cells = [
  [near, near],
  [middle, near],
  [far, near],
  [far, middle],
  [far, far],
  [middle, far],
  [near, far],
  [near, middle],
  [middle, middle],
] as const;

const cellSize = { width: 3.4, height: 3.4, borderRadius: 0.8 };

type AnimatedStyle = ReturnType<typeof useAnimatedStyle<{ opacity: number }>>;

interface CellMotion {
  step: SharedValue<number>;
  still: boolean;
}

function useCellStyle(
  index: number,
  { step, still }: CellMotion,
): AnimatedStyle {
  return useAnimatedStyle(() => {
    if (still) return { opacity: 0.4 };
    const sinceLit = (step.get() - index + cells.length) % cells.length;

    return {
      opacity:
        sinceLit < fadeSteps
          ? 1 - (1 - restingOpacity) * (sinceLit / fadeSteps)
          : restingOpacity,
    };
  }, [index, step, still]);
}

interface CellProps {
  index: number;
  left: number;
  top: number;
  motion: CellMotion;
}

function Cell({ index, left, top, motion }: CellProps): React.JSX.Element {
  return (
    <Animated.View
      testID="working-mark-cell"
      style={[{ left, top, ...cellSize }, useCellStyle(index, motion)]}
      className="absolute bg-muted-foreground"
    />
  );
}

const cycle = (): number =>
  withRepeat(
    withTiming(cells.length, {
      duration: cells.length * stepMilliseconds,
      easing: Easing.linear,
    }),
    -1,
  );

function useStep(reducedMotion: boolean): SharedValue<number> {
  const step = useSharedValue(0);
  useEffect(() => {
    if (!reducedMotion) step.set(cycle());

    return (): void => cancelAnimation(step);
  }, [reducedMotion, step]);

  return step;
}

const cellElements = (motion: CellMotion): React.JSX.Element[] =>
  cells.map(([left, top], index) => (
    <Cell
      key={`${left}:${top}`}
      index={index}
      left={left}
      top={top}
      motion={motion}
    />
  ));

// Paper's Working mark: a 3×3 grid where one cell at a time lights and fades.
export function WorkingMark(): React.JSX.Element {
  const still = useReducedMotion();
  const motion = { step: useStep(still), still };

  return (
    <IconSlot role="control" testID="working-mark">
      {cellElements(motion)}
    </IconSlot>
  );
}
