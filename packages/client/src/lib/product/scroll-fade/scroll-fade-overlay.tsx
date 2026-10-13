import type * as React from 'react';
import { useId } from 'react';
import { type ColorValue, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { bezierEasing } from '#lib/generic/bezier-easing';
import { easingCurve, motionDuration } from '#lib/generic/motion';

export interface ScrollFadeProps {
  edge: 'top' | 'bottom';
  // The surface colour the content fades into.
  className?: string;
  height?: number;
  // How far something covers the list at this edge: the gradient ends there, and the surface fills the rest.
  inset?: number;
}

type FadeEdge = ScrollFadeProps['edge'];
type FadeColor = ColorValue | undefined;

// How deep content fades at each edge unless a caller says otherwise.
export const scrollFadeDepth = { top: 28, bottom: 36 } as const;

const fadeEasing = bezierEasing(easingCurve.standard);
const [fadeIn, fadeOut] = [FadeIn, FadeOut].map((animation) =>
  animation
    .duration(motionDuration.enter)
    .easing(fadeEasing)
    .reduceMotion(ReduceMotion.System),
);

const fadeOverlayProps = {
  entering: fadeIn,
  exiting: fadeOut,
  pointerEvents: 'none',
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

const edgePlacements = {
  top: { flexDirection: 'column-reverse', top: 0 },
  bottom: { flexDirection: 'column', bottom: 0 },
} satisfies Record<FadeEdge, ViewStyle>;

// The surface's opacity where the gradient starts and where it ends.
const edgeOpacities = {
  top: [1, 0],
  bottom: [0, 1],
} satisfies Record<FadeEdge, [number, number]>;

const overlayStyle = (edge: FadeEdge, height: number): ViewStyle => ({
  position: 'absolute',
  left: 0,
  right: 0,
  zIndex: 10,
  height,
  ...edgePlacements[edge],
});

function fadeMeasures({ edge, height, inset = 0 }: ScrollFadeProps): {
  depth: number;
  inset: number;
} {
  return { depth: height ?? scrollFadeDepth[edge], inset };
}

function useFadeColor(className = 'bg-sidebar'): FadeColor {
  return useResolveClassNames(className).backgroundColor;
}

// A gradient from the surface colour to transparent where a list meets its edge; it fades in and out.
export function ScrollFade(props: ScrollFadeProps): React.JSX.Element {
  const color = useFadeColor(props.className);
  const { depth, inset } = fadeMeasures(props);
  return (
    <Animated.View
      {...fadeOverlayProps}
      testID={`scroll-fade-${props.edge}`}
      style={overlayStyle(props.edge, depth + inset)}
    >
      <FadeGradient edge={props.edge} color={color} depth={depth} />
      <InsetFill height={inset} color={color} />
    </Animated.View>
  );
}

interface FadeGradientProps {
  edge: FadeEdge;
  color: FadeColor;
  depth: number;
}

// Drawn afresh for each depth: the native gradient keeps the size it was first drawn at, so when the Feed leaves its end and the fade deepens, only its top would fade.
function FadeGradient(props: FadeGradientProps): React.JSX.Element {
  const gradientId = `${useId().replaceAll(':', '')}-${props.edge}`;
  return (
    <View style={{ height: props.depth }}>
      <Svg key={props.depth} width="100%" height="100%">
        <Defs>
          <GradientStops id={gradientId} {...props} />
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

function GradientStops({
  id,
  edge,
  color,
}: FadeGradientProps & { id: string }): React.JSX.Element {
  const [from, to] = edgeOpacities[edge];
  return (
    <LinearGradient id={id} x1="0" y1="0%" x2="0" y2="100%">
      <Stop offset="0" stopColor={color} stopOpacity={from} />
      <Stop offset="0.5" stopColor={color} stopOpacity={0.85} />
      <Stop offset="1" stopColor={color} stopOpacity={to} />
    </LinearGradient>
  );
}

function InsetFill(props: {
  height: number;
  color: FadeColor;
}): React.JSX.Element | null {
  if (props.height <= 0) return null;
  return (
    <View style={{ height: props.height, backgroundColor: props.color }} />
  );
}
