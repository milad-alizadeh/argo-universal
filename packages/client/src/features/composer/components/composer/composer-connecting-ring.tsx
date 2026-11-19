import { useAnimatedStyle } from '@repo/kit/animated-hooks';
import type * as React from 'react';
import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useCSSVariable } from 'uniwind';

export const connectingRingId = 'composer-connecting';

const ringSize = 28;

const ringCentre = 14;

const ringRadius = 11.5;

const ringStroke = 1.6;

const turnMilliseconds = 900;

const fullTurn = 360;

// A quarter of the ring, drawn from twelve o'clock round to three.
const arcPath = 'M14 2.5A11.5 11.5 0 0 1 25.5 14';

function useTurn(): SharedValue<number> {
  const turn = useSharedValue(0);

  useEffect(() => {
    const timing = { duration: turnMilliseconds, easing: Easing.linear };
    turn.set(withRepeat(withTiming(1, timing), -1));

    return (): void => cancelAnimation(turn);
  }, [turn]);

  return turn;
}

function Track(): React.JSX.Element {
  const colour = useCSSVariable('--color-neutral-600');

  return (
    <Circle
      cx={ringCentre}
      cy={ringCentre}
      r={ringRadius}
      stroke={String(colour)}
      strokeWidth={ringStroke}
    />
  );
}

function Arc(): React.JSX.Element {
  const colour = useCSSVariable('--color-primary-foreground');

  return (
    <Path
      d={arcPath}
      stroke={String(colour)}
      strokeWidth={ringStroke}
      strokeLinecap="round"
    />
  );
}

// The ring turning, as an animated style.
function useTurnStyle(): ReturnType<typeof useAnimatedStyle> {
  const turn = useTurn();

  return useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.get() * fullTurn}deg` }],
  }));
}

/*
 * Option B of the Voice page's connecting state: End's X is already there, and an arc turns round it inside the circle.
 * It sits over the End button and takes no press, so pressing End still cancels the call.
 */
export function ConnectingRing(): React.JSX.Element {
  const style = useTurnStyle();

  return (
    <Animated.View
      testID={connectingRingId}
      className="pointer-events-none absolute inset-0"
      style={style}
    >
      <Svg width={ringSize} height={ringSize} viewBox="0 0 28 28" fill="none">
        <Track />
        <Arc />
      </Svg>
    </Animated.View>
  );
}
