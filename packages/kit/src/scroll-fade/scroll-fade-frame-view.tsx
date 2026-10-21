import type * as React from 'react';
import type { ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { ScrollColumnContext } from '#kit/scroll-column';
import { cn } from '#kit/utils';
import {
  ScrollFadeGradient,
  type ScrollFadeGradientProps,
} from './scroll-fade-gradient';
import {
  type PerEdge,
  type ScrollFadeEdge,
  type ScrollFadeEdgeName,
  type ScrollFadeMetrics,
  type ScrollFadeOptions,
  type ScrollFadeTracking,
  edgeInset,
  edgeMode,
  fadeEdgesFor,
  isStartEdge,
  scrollFadeRamp,
} from './scroll-fade-options';

export interface ScrollFadeFrameProps extends Omit<ScrollFadeOptions, 'depth'> {
  depth: Required<PerEdge<number>>;
  // Its scroll view scrolls sideways, so its leading and trailing edges fade rather than its top and bottom.
  horizontal?: boolean;
  // From useScrollFadeTracking, also wired to the scroll view.
  tracking: ScrollFadeTracking;
  className?: string;
  style?: StyleProp<ViewStyle>;
  // The one scroll view whose content fades.
  children: ReactNode;
}

type FadeOptions = Omit<ScrollFadeFrameProps, 'tracking' | 'children'>;

// How much content lies past an edge, from the scroll view's measures.
function hiddenPast(
  edge: ScrollFadeEdgeName,
  { offset, content, viewport }: ScrollFadeMetrics,
): number {
  'worklet';

  if (isStartEdge(edge)) return offset.get();

  return viewport.get() > 0 ? content.get() - offset.get() - viewport.get() : 0;
}

// Whole once content lies a ramp's length past the edge, unless the edge always fades.
function edgeOpacity(
  edge: ScrollFadeEdgeName,
  mode: ScrollFadeEdge,
  metrics: ScrollFadeMetrics | undefined,
): number {
  'worklet';

  if (mode !== 'scrolled' || !metrics) return 1;
  const hidden = hiddenPast(edge, metrics);

  return interpolate(hidden, [0, scrollFadeRamp], [0, 1], Extrapolation.CLAMP);
}

interface EdgeFadeProps {
  edge: ScrollFadeEdgeName;
  metrics?: ScrollFadeMetrics;
  options: FadeOptions;
}

const gradientProps = (
  edge: ScrollFadeEdgeName,
  options: FadeOptions,
): ScrollFadeGradientProps => ({
  edge,
  className: options.surfaceClassName,
  height: options.depth[edge],
  inset: edgeInset(edge, options.inset),
});

// One edge's gradient, its opacity set on the UI thread as the view scrolls.
function EdgeFade({
  edge,
  metrics,
  options,
}: EdgeFadeProps): React.JSX.Element | null {
  const mode = edgeMode(edge, options.edges);

  const style = useAnimatedStyle(() => ({
    opacity: edgeOpacity(edge, mode, metrics),
  }));

  if (mode === 'never') return null;

  return <ScrollFadeGradient {...gradientProps(edge, options)} style={style} />;
}

// The frame's length along the scroll's axis.
const measureViewport =
  (metrics: ScrollFadeMetrics | undefined, horizontal: boolean | undefined) =>
  ({ nativeEvent: { layout } }: LayoutChangeEvent): void =>
    metrics?.viewport.set(horizontal ? layout.width : layout.height);

function EdgeFades({
  metrics,
  options,
}: Omit<EdgeFadeProps, 'edge'>): React.JSX.Element[] {
  return fadeEdgesFor(options.horizontal).map((edge) => (
    <EdgeFade key={edge} edge={edge} metrics={metrics} options={options} />
  ));
}

// Around a scroll view: native draws a gradient in the surface colour over each edge that fades.
export function ScrollFadeFrame(
  props: ScrollFadeFrameProps,
): React.JSX.Element {
  const { tracking, className, style, children, ...options } = props;
  const onLayout = measureViewport(tracking.metrics, options.horizontal);
  const frameClassName = cn('relative', className);

  return (
    <View className={frameClassName} style={style} onLayout={onLayout}>
      <ScrollColumnContext value={undefined}>{children}</ScrollColumnContext>
      <EdgeFades metrics={tracking.metrics} options={options} />
    </View>
  );
}
