import { useCollapsibleHovered } from '@repo/kit/primitives/layout/collapsible';
import type { ReactNode } from 'react';
import type * as React from 'react';
import { Text } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import {
  piecesOf,
  shimmered,
  shimmerOpacity,
  useBandSweep,
  useShimmerStyle,
} from './shimmer-sweep';

interface TitleProps {
  text: string;
  chevron: ReactNode;
}

interface TitleSweep {
  hovered: boolean;
  reduced: boolean;
  sweep: ReturnType<typeof useBandSweep>;
}

function useTitleSweep(text: string): TitleSweep {
  const hovered = useCollapsibleHovered();
  const reduced = useReducedMotion();
  const sweep = useBandSweep(reduced, text.length + 2);

  return { hovered, reduced, sweep };
}

interface LabelProps {
  text: string;
  state: TitleSweep;
}

function shimmerContent({ text, state }: LabelProps): React.ReactNode {
  if (state.reduced) return text;

  return shimmered({
    pieces: piecesOf(text),
    sweep: state.sweep,
    emphasized: state.hovered,
  });
}

function ShimmerLabel(props: LabelProps): React.JSX.Element {
  return (
    <Text
      numberOfLines={1}
      selectable={false}
      className="min-w-0 shrink type-body text-foreground"
    >
      {shimmerContent(props)}
    </Text>
  );
}

function ShimmerChevron(
  props: TitleProps & { state: TitleSweep },
): React.JSX.Element {
  const { text, chevron, state } = props;

  const style = useShimmerStyle({
    centre: text.length + 1,
    sweep: state.sweep,
    opacity: shimmerOpacity[state.hovered ? 'emphasized' : 'plain'],
  });

  return (
    <Animated.View style={state.reduced ? undefined : style}>
      {chevron}
    </Animated.View>
  );
}

export function ShimmerDisclosureTitle(props: TitleProps): React.JSX.Element {
  const state = useTitleSweep(props.text);

  return (
    <>
      <ShimmerLabel text={props.text} state={state} />
      <ShimmerChevron {...props} state={state} />
    </>
  );
}
