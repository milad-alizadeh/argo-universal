import { withOccurrenceKeys } from '@repo/kit/occurrence-keys';
import { Text } from '@repo/kit/primitives/content/text';
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

// How many characters the bright band spans on each side of its centre.
const bandHalfWidth = 8;

const sweepMilliseconds = 1600;

const shimmerOpacity = {
  plain: { resting: 0.45, highlight: 0.55 },
  emphasized: { resting: 0.7, highlight: 0.3 },
};

/*
 * A character at a time, so the band ramps across a word instead of lighting the whole of it at once.
 * Each piece carries the spaces that follow it, so no piece is a lone space the web would collapse.
 */
const piecesOf = (text: string): string[] => text.match(/\S\s*|\s+/gu) ?? [];

// Where each piece's centre sits along the text, in characters, which is what the band is measured in.
function pieceCentres(pieces: readonly string[]): number[] {
  let start = 0;

  return pieces.map((piece) => {
    const centre = start + piece.length / 2;
    start += piece.length;

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
        : shimmered({ pieces: piecesOf(text), sweep, emphasized })}
    </Text>
  );
}

interface ShimmeredProps {
  pieces: string[];
  sweep: Sweep;
  emphasized: boolean;
}

function shimmered(props: ShimmeredProps): React.JSX.Element[] {
  const { pieces, sweep: sweepValues } = props;
  const opacity = shimmerOpacity[props.emphasized ? 'emphasized' : 'plain'];
  const centres = pieceCentres(pieces);

  return withOccurrenceKeys(pieces, (piece) => piece).map(
    ({ item: piece, key }, index) => (
      <ShimmerPiece
        key={key}
        piece={piece}
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

interface ShimmerPieceProps {
  piece: string;
  shimmer: ShimmerStyleProps;
}

function ShimmerPiece(props: ShimmerPieceProps): React.JSX.Element {
  const style = useShimmerStyle(props.shimmer);

  return (
    <Animated.Text accessible={false} selectable={false} style={style}>
      {props.piece}
    </Animated.Text>
  );
}
