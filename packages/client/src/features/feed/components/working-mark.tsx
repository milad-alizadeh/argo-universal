import type * as React from 'react';
import { useEffect } from 'react';
import { View } from 'react-native';
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

function Cell({
  index,
  left,
  top,
  step,
  still,
}: {
  index: number;
  left: number;
  top: number;
  step: SharedValue<number>;
  still: boolean;
}): React.JSX.Element {
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: 0.4 };
    const sinceLit = (step.get() - index + cells.length) % cells.length;
    return {
      opacity:
        sinceLit < fadeSteps
          ? 1 - (1 - restingOpacity) * (sinceLit / fadeSteps)
          : restingOpacity,
    };
  }, [index, step, still]);
  return (
    <Animated.View
      testID="working-mark-cell"
      style={[{ left, top, width: 3.4, height: 3.4, borderRadius: 0.8 }, style]}
      className="absolute bg-muted-foreground"
    />
  );
}

// Paper's Working mark: a 3×3 grid where one cell at a time lights and fades.
export function WorkingMark(): React.JSX.Element {
  const step = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    if (!reducedMotion)
      step.set(
        withRepeat(
          withTiming(cells.length, {
            duration: cells.length * stepMilliseconds,
            easing: Easing.linear,
          }),
          -1,
        ),
      );
    return (): void => cancelAnimation(step);
  }, [reducedMotion, step]);
  return (
    <View testID="working-mark" className="size-icon-md shrink-0">
      {cells.map(([left, top], index) => (
        <Cell
          key={`${left}:${top}`}
          index={index}
          left={left}
          top={top}
          step={step}
          still={reducedMotion}
        />
      ))}
    </View>
  );
}
