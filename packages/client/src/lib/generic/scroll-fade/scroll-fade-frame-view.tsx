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
import { ScrollColumnContext } from '#lib/generic/scroll-column';
import { cn } from '#lib/generic/utils';
import {
  ScrollFadeGradient,
  type ScrollFadeGradientProps,
} from './scroll-fade-gradient';
import {
  type ScrollFadeEdge,
  type ScrollFadeEdgeName,
  type ScrollFadeMetrics,
  type ScrollFadeOptions,
  type ScrollFadeTracking,
  edgeDepth,
  edgeInset,
  edgeMode,
  scrollFadeRamp,
} from './scroll-fade-options';

export interface ScrollFadeFrameProps extends ScrollFadeOptions {
  // From useScrollFadeTracking, also wired to the scroll view.
  tracking: ScrollFadeTracking;
  className?: string;
  style?: StyleProp<ViewStyle>;
  // The one scroll view whose content fades.
  children: ReactNode;
}

const fadeEdges: ScrollFadeEdgeName[] = ['top', 'bottom'];

// How much content lies past an edge, from the scroll view's measures.
function hiddenPast(
  edge: ScrollFadeEdgeName,
  { offset, content, viewport }: ScrollFadeMetrics,
): number {
  'worklet';

  if (edge === 'top') return offset.get();

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
  options: ScrollFadeOptions;
}

const gradientProps = (
  edge: ScrollFadeEdgeName,
  options: ScrollFadeOptions,
): ScrollFadeGradientProps => ({
  edge,
  className: options.surfaceClassName,
  height: edgeDepth(edge, options.depth),
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

const measureViewport =
  (metrics: ScrollFadeMetrics | undefined) =>
  ({ nativeEvent }: LayoutChangeEvent): void =>
    metrics?.viewport.set(nativeEvent.layout.height);

function EdgeFades({
  metrics,
  options,
}: Omit<EdgeFadeProps, 'edge'>): React.JSX.Element[] {
  return fadeEdges.map((edge) => (
    <EdgeFade key={edge} edge={edge} metrics={metrics} options={options} />
  ));
}

// Around a scroll view: native draws a gradient in the surface colour over each edge that fades.
export function ScrollFadeFrame(
  props: ScrollFadeFrameProps,
): React.JSX.Element {
  const { tracking, className, style, children, ...options } = props;
  const onLayout = measureViewport(tracking.metrics);
  const frameClassName = cn('relative', className);

  return (
    <View className={frameClassName} style={style} onLayout={onLayout}>
      <ScrollColumnContext value={undefined}>{children}</ScrollColumnContext>
      <EdgeFades metrics={tracking.metrics} options={options} />
    </View>
  );
}
