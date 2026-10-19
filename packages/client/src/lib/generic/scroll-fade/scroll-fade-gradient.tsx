import type * as React from 'react';
import { useId } from 'react';
import {
  type ColorValue,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import type { ScrollFadeEdgeName } from './scroll-fade-options';

export interface ScrollFadeGradientProps {
  edge: ScrollFadeEdgeName;
  // The surface colour the content fades into.
  className?: string;
  // Its depth across the edge: a height at the top or bottom, a width at the leading or trailing edge.
  height: number;
  // How far something covers the list at this edge: the gradient ends there, and the surface fills the rest.
  inset?: number;
  // Its opacity, which a scroll view's frame drives on the UI thread.
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
}

// Halfway through the gradient, the surface already nearly hides the content.
const midOpacity = 0.85;

// Each stop's offset and opacity, from the edge's surface out to the content.
const fromEdge = [
  { offset: '0', stopOpacity: 1 },
  { offset: '0.5', stopOpacity: midOpacity },
  { offset: '1', stopOpacity: 0 },
] as const;

// The same stops from the content out to the edge's surface.
const toEdge = [
  { offset: '0', stopOpacity: 0 },
  { offset: '0.5', stopOpacity: midOpacity },
  { offset: '1', stopOpacity: 1 },
] as const;

const isHorizontal = (edge: ScrollFadeEdgeName): boolean =>
  edge === 'leading' || edge === 'trailing';

// Each edge's stops, top to bottom or left to right, and the direction the gradient runs.
const gradients = {
  top: { stops: fromEdge, x2: '0', y2: '100%' },
  bottom: { stops: toEdge, x2: '0', y2: '100%' },
  leading: { stops: fromEdge, x2: '100%', y2: '0' },
  trailing: { stops: toEdge, x2: '100%', y2: '0' },
} as const;

// The gradient sits against its edge, and the inset fill beyond it.
const placement = {
  top: { top: 0, left: 0, right: 0, flexDirection: 'column-reverse' },
  bottom: { bottom: 0, left: 0, right: 0, flexDirection: 'column' },
  leading: { left: 0, top: 0, bottom: 0, flexDirection: 'row-reverse' },
  trailing: { right: 0, top: 0, bottom: 0, flexDirection: 'row' },
} as const;

// Its length across the edge.
const across = (
  edge: ScrollFadeEdgeName,
  length: number,
): { width: number } | { height: number } =>
  isHorizontal(edge) ? { width: length } : { height: length };

interface FadeSize {
  depth: number;
  inset: number;
}

const fadeSize = ({ height, inset }: ScrollFadeGradientProps): FadeSize => ({
  depth: height,
  inset: inset ?? 0,
});

// Out of reach of touches and screen readers.
const decorative = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

const overlay = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 10,
} as const;

// Laid over the list's edge.
const overlayProps = (
  edge: ScrollFadeEdgeName,
  size: FadeSize,
  style: ScrollFadeGradientProps['style'],
): React.ComponentProps<typeof Animated.View> => ({
  ...decorative,
  testID: `scroll-fade-${edge}`,
  style: [
    overlay,
    placement[edge],
    across(edge, size.depth + size.inset),
    style,
  ],
});

interface FillProps {
  edge: ScrollFadeEdgeName;
  color: ColorValue | undefined;
}

function EdgeGradient({
  id,
  edge,
  color,
}: FillProps & { id: string }): React.JSX.Element {
  const { stops, x2, y2 } = gradients[edge];

  return (
    <LinearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      {stops.map((stop) => (
        <Stop key={stop.offset} {...stop} stopColor={color} />
      ))}
    </LinearGradient>
  );
}

function GradientStops(fill: FillProps): React.JSX.Element {
  const id = `${useId().replaceAll(':', '')}-${fill.edge}`;

  return (
    <>
      <Defs>
        <EdgeGradient id={id} {...fill} />
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </>
  );
}

// Drawn afresh for each depth: the native gradient keeps the size it was first drawn at, so when the Feed leaves its end and the fade deepens, only its top would fade.
function GradientFill({
  depth,
  ...fill
}: FillProps & { depth: number }): React.JSX.Element {
  return (
    <View style={across(fill.edge, depth)}>
      <Svg key={depth} width="100%" height="100%">
        <GradientStops {...fill} />
      </Svg>
    </View>
  );
}

// A gradient from the surface colour to transparent where a list meets its edge.
export function ScrollFadeGradient(
  props: ScrollFadeGradientProps,
): React.JSX.Element {
  const { edge, className, style } = props;
  const { backgroundColor } = useResolveClassNames(className ?? 'bg-content');
  const size = fadeSize(props);

  return (
    <Animated.View {...overlayProps(edge, size, style)}>
      <GradientFill edge={edge} color={backgroundColor} depth={size.depth} />
      <View style={[across(edge, size.inset), { backgroundColor }]} />
    </Animated.View>
  );
}
