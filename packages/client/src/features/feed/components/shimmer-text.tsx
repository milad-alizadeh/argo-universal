import { Text } from '@repo/kit/primitives/content/text';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { Platform } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { piecesOf, shimmered, useBandSweep } from './shimmer-sweep';

interface ShimmerTextProps {
  text: string;
  className?: string;
  emphasized?: boolean;
}

// What either drawing takes: the props, with the caller's default for `emphasized` already filled in.
type ShimmerProps = Omit<ShimmerTextProps, 'emphasized'> & {
  emphasized: boolean;
};

const shimmerClass = (
  className: string | undefined,
  emphasized: boolean,
): string =>
  cn('shimmer-text', emphasized && 'shimmer-text-emphasized', className);

/*
 * The browser sweeps the same band as a mask it animates itself, `shimmer-text` in react-native-web.css, so a line
 * costs one node and no JavaScript a frame. It holds the band still under reduced motion, as the media query says.
 */
function MaskedShimmer({
  text,
  className,
  emphasized,
}: ShimmerProps): React.JSX.Element {
  return (
    <Text
      numberOfLines={1}
      selectable={false}
      className={shimmerClass(className, emphasized)}
    >
      {text}
    </Text>
  );
}

// A piece at a time, where there is no mask to sweep.
function SweptShimmer({
  text,
  className,
  emphasized,
}: ShimmerProps): React.JSX.Element {
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

const Shimmer = Platform.OS === 'web' ? MaskedShimmer : SweptShimmer;

// A line of text a band of brightness sweeps across while the Agent works.
export function ShimmerText({
  text,
  className,
  emphasized = false,
}: ShimmerTextProps): React.JSX.Element {
  return <Shimmer text={text} className={className} emphasized={emphasized} />;
}
