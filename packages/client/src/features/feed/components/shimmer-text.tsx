import type * as React from 'react';
import { useEffect, useMemo } from 'react';
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
import { Text } from '#primitives/content/text';

// How many characters the bright band spans on each side of its centre.
const bandHalfWidth = 8;

const sweepMilliseconds = 1600;

const shimmerOpacity = {
  plain: { resting: 0.45, highlight: 0.55 },
  emphasized: { resting: 0.7, highlight: 0.3 },
};

/*
 * A word at a time, not a character: a running title is one animated node per word rather than per
 * letter, and the band is wide enough that a word still brightens and dims as it passes.
 */
const wordsOf = (text: string): string[] => text.match(/\S+\s*|\s+/gu) ?? [];

// Where each word's centre sits along the text, in characters, which is what the band is measured in.
function wordCentres(words: readonly string[]): number[] {
  let start = 0;

  return words.map((word) => {
    const centre = start + word.length / 2;
    start += word.length;

    return centre;
  });
}

const sweep = (): number =>
  withRepeat(
    withTiming(1, { duration: sweepMilliseconds, easing: Easing.linear }),
    -1,
  );

/*
 * The sweep runs from 0 to 1 and the text's length is read inside the worklet, so a title growing as
 * the Agent works widens the sweep in place instead of starting it over.
 */
function useSweep(reducedMotion: boolean): SharedValue<number> {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(0);

    if (!reducedMotion) progress.set(sweep());

    return (): void => cancelAnimation(progress);
  }, [reducedMotion, progress]);

  return progress;
}

function useSweepSpan(characterCount: number): SharedValue<number> {
  const span = useSharedValue(characterCount + bandHalfWidth * 2);
  useEffect(() => {
    span.set(characterCount + bandHalfWidth * 2);
  }, [characterCount, span]);

  return span;
}

interface Sweep {
  progress: SharedValue<number>;
  span: SharedValue<number>;
}

// One object for the sweep, so a word's worklet is built once and not again on every draw.
function useBandSweep(reducedMotion: boolean, characterCount: number): Sweep {
  const progress = useSweep(reducedMotion);
  const span = useSweepSpan(characterCount);

  return useMemo(() => ({ progress, span }), [progress, span]);
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
  const sweep = useBandSweep(reducedMotion, text.length);

  return (
    <Text numberOfLines={1} selectable={false} className={className}>
      {reducedMotion
        ? text
        : shimmered({ words: wordsOf(text), sweep, emphasized })}
    </Text>
  );
}

interface ShimmeredProps {
  words: string[];
  sweep: Sweep;
  emphasized: boolean;
}

function shimmered(props: ShimmeredProps): React.JSX.Element[] {
  const { words, sweep: sweepValues } = props;
  const opacity = shimmerOpacity[props.emphasized ? 'emphasized' : 'plain'];
  const centres = wordCentres(words);

  return withOccurrenceKeys(words, (word) => word).map(
    ({ item: word, key }, index) => (
      <ShimmerWord
        key={key}
        word={word}
        shimmer={{ centre: centres[index] ?? 0, sweep: sweepValues, opacity }}
      />
    ),
  );
}

interface Opacity {
  resting: number;
  highlight: number;
}

interface ShimmerStyleProps {
  centre: number;
  sweep: Sweep;
  opacity: Opacity;
}

// A word's opacity once the band's centre has reached `position` characters along the text.
function bandOpacity(
  opacity: Opacity,
  centre: number,
  position: number,
): number {
  'worklet';

  const share = Math.max(0, 1 - Math.abs(centre - position) / bandHalfWidth);

  return opacity.resting + opacity.highlight * share;
}

// How far the band's centre has travelled along the text, in characters.
function bandCentre(sweep: Sweep): number {
  'worklet';

  return sweep.progress.get() * sweep.span.get() - bandHalfWidth;
}

function useShimmerStyle(
  props: ShimmerStyleProps,
): ReturnType<typeof useAnimatedStyle<{ opacity: number }>> {
  const { centre, opacity, sweep } = props;

  return useAnimatedStyle(
    () => ({ opacity: bandOpacity(opacity, centre, bandCentre(sweep)) }),
    [opacity, centre, sweep],
  );
}

interface ShimmerWordProps {
  word: string;
  shimmer: ShimmerStyleProps;
}

function ShimmerWord(props: ShimmerWordProps): React.JSX.Element {
  const style = useShimmerStyle(props.shimmer);

  return (
    <Animated.Text accessible={false} selectable={false} style={style}>
      {props.word}
    </Animated.Text>
  );
}
