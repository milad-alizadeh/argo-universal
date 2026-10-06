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
import { Text } from '#primitives/text';

export function ShimmerText({
  text,
  className,
  emphasized = false,
}: {
  text: string;
  className?: string;
  emphasized?: boolean;
}) {
  const position = useSharedValue(-8);
  const reducedMotion = useReducedMotion();
  const characters = Array.from(text);
  useEffect(() => {
    position.value = -8;
    if (!reducedMotion)
      position.value = withRepeat(
        withTiming(characters.length + 8, {
          duration: 1600,
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
        : characters.map((character, index) => (
            <ShimmerCharacter
              key={`${index}:${character}`}
              character={character}
              index={index}
              position={position}
              emphasized={emphasized}
            />
          ))}
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
  const style = useAnimatedStyle(
    () => ({
      opacity:
        (emphasized ? 0.7 : 0.45) +
        (emphasized ? 0.3 : 0.55) *
          Math.max(0, 1 - Math.abs(index - position.value) / 8),
    }),
    [emphasized, index, position],
  );
  return (
    <Animated.Text accessible={false} selectable={false} style={style}>
      {character}
    </Animated.Text>
  );
}
