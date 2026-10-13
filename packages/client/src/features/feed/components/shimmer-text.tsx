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
import { withOccurrenceKeys } from '#lib/generic/occurrence-keys';
import { Text } from '#lib/generic/primitives/display/text/text';

// How many characters the bright band spans on each side of its centre.
const bandHalfWidth = 8;

const sweepMilliseconds = 1600;

const shimmerOpacity = {
  plain: { resting: 0.45, highlight: 0.55 },
  emphasized: { resting: 0.7, highlight: 0.3 },
};

const sweep = (characterCount: number): number =>
  withRepeat(
    withTiming(characterCount + bandHalfWidth, {
      duration: sweepMilliseconds,
      easing: Easing.linear,
    }),
    -1,
  );

function useSweepPosition(
  characterCount: number,
  reducedMotion: boolean,
): SharedValue<number> {
  const position = useSharedValue(-bandHalfWidth);
  useEffect(() => {
    position.set(-bandHalfWidth);

    if (!reducedMotion) position.set(sweep(characterCount));

    return (): void => cancelAnimation(position);
  }, [characterCount, reducedMotion, position]);

  return position;
}

interface ShimmerTextProps {
  text: string;
  className?: string;
  emphasized?: boolean;
}

export function ShimmerText({
  text,
  className,
  emphasized = false,
}: ShimmerTextProps): React.JSX.Element {
  const reducedMotion = useReducedMotion();
  const characters = Array.from(text, (character) => character);
  const position = useSweepPosition(characters.length, reducedMotion);

  return (
    <Text numberOfLines={1} selectable={false} className={className}>
      {reducedMotion ? text : shimmered({ characters, position, emphasized })}
    </Text>
  );
}

interface ShimmeredProps {
  characters: string[];
  position: SharedValue<number>;
  emphasized: boolean;
}

function shimmered(props: ShimmeredProps): React.JSX.Element[] {
  const { characters, position } = props;
  const opacity = shimmerOpacity[props.emphasized ? 'emphasized' : 'plain'];

  return withOccurrenceKeys(characters, (character) => character).map(
    ({ item: character, key }, index) => (
      <ShimmerCharacter
        key={key}
        character={character}
        shimmer={{ index, position, opacity }}
      />
    ),
  );
}

interface ShimmerStyleProps {
  index: number;
  position: SharedValue<number>;
  opacity: { resting: number; highlight: number };
}

function useShimmerStyle(
  props: ShimmerStyleProps,
): ReturnType<typeof useAnimatedStyle<{ opacity: number }>> {
  const { index, position } = props;
  const { resting, highlight } = props.opacity;

  return useAnimatedStyle(
    () => ({
      opacity:
        resting +
        highlight *
          Math.max(0, 1 - Math.abs(index - position.get()) / bandHalfWidth),
    }),
    [resting, highlight, index, position],
  );
}

interface ShimmerCharacterProps {
  character: string;
  shimmer: ShimmerStyleProps;
}

function ShimmerCharacter(props: ShimmerCharacterProps): React.JSX.Element {
  const style = useShimmerStyle(props.shimmer);

  return (
    <Animated.Text accessible={false} selectable={false} style={style}>
      {props.character}
    </Animated.Text>
  );
}
