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
import { withOccurrenceKeys } from '#lib/occurrence-keys';
import { Text } from '#primitives/text';

// How many characters the bright band spans on each side of its centre.
const bandHalfWidth = 8;
const sweepMilliseconds = 1600;
const shimmerOpacity = {
  plain: { resting: 0.45, highlight: 0.55 },
  emphasized: { resting: 0.7, highlight: 0.3 },
};

export function ShimmerText({
  text,
  className,
  emphasized = false,
}: {
  text: string;
  className?: string;
  emphasized?: boolean;
}) {
  const position = useSharedValue(-bandHalfWidth);
  const reducedMotion = useReducedMotion();
  const characters = Array.from(text);
  useEffect(() => {
    position.value = -bandHalfWidth;
    if (!reducedMotion)
      position.value = withRepeat(
        withTiming(characters.length + bandHalfWidth, {
          duration: sweepMilliseconds,
          easing: Easing.linear,
        }),
        -1,
      );
    return () => cancelAnimation(position);
  }, [characters.length, reducedMotion, position]);
  return (
    <Text numberOfLines={1} selectable={false} className={className}>
      {reducedMotion
        ? text
        : withOccurrenceKeys(characters, (character) => character).map(
            ({ item: character, key }, index) => (
              <ShimmerCharacter
                key={key}
                character={character}
                index={index}
                position={position}
                emphasized={emphasized}
              />
            ),
          )}
    </Text>
  );
}

function ShimmerCharacter({
  character,
  index,
  position,
  emphasized,
}: {
  character: string;
  index: number;
  position: SharedValue<number>;
  emphasized: boolean;
}) {
  const { resting, highlight } = emphasized
    ? shimmerOpacity.emphasized
    : shimmerOpacity.plain;
  const style = useAnimatedStyle(
    () => ({
      opacity:
        resting +
        highlight *
          Math.max(0, 1 - Math.abs(index - position.value) / bandHalfWidth),
    }),
    [resting, highlight, index, position],
  );
  return (
    <Animated.Text accessible={false} selectable={false} style={style}>
      {character}
    </Animated.Text>
  );
}
