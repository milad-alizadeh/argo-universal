import { useCallback, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollViewProps,
} from 'react-native';
import type { ScrollFadeEdges } from './scroll-fade-frame';

export interface ScrollFadeEdgeHandlers {
  edges: ScrollFadeEdges;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onViewportChange: (height: number) => void;
}

interface ScrollMetrics {
  offset: number;
  inset: number;
  content: number;
  viewport: number;
}

interface MeasuredEdges {
  edges: ScrollFadeEdges;
  measure: (metrics: Partial<ScrollMetrics>) => void;
}

const noFadeEdges: ScrollFadeEdges = { top: false, bottom: false };

function fadeEdgesOf(metrics: ScrollMetrics): ScrollFadeEdges {
  const { offset, inset, content, viewport } = metrics;
  return {
    top: offset + inset > 0,
    bottom: viewport > 0 && content - offset - viewport > 1,
  };
}

const keepIfSame =
  (next: ScrollFadeEdges) =>
  (current: ScrollFadeEdges): ScrollFadeEdges =>
    current.top === next.top && current.bottom === next.bottom ? current : next;

function scrollMetricsOf(nativeEvent: NativeScrollEvent): ScrollMetrics {
  return {
    offset: nativeEvent.contentOffset.y,
    inset: nativeEvent.contentInset?.top ?? 0,
    content: nativeEvent.contentSize.height,
    viewport: nativeEvent.layoutMeasurement.height,
  };
}

function useMeasuredEdges(): MeasuredEdges {
  const [edges, setEdges] = useState(noFadeEdges);
  const metrics = useRef({ offset: 0, inset: 0, content: 0, viewport: 0 });
  const measure = useCallback((changed: Partial<ScrollMetrics>) => {
    metrics.current = { ...metrics.current, ...changed };
    setEdges(keepIfSame(fadeEdgesOf(metrics.current)));
  }, []);
  return { edges, measure };
}

function useScrollHandler(
  { measure }: MeasuredEdges,
  onScroll: ScrollViewProps['onScroll'],
): ScrollFadeEdgeHandlers['onScroll'] {
  return useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      measure(scrollMetricsOf(event.nativeEvent));
      onScroll?.(event);
    },
    [measure, onScroll],
  );
}

function useContentSizeHandler({
  measure,
}: MeasuredEdges): ScrollFadeEdgeHandlers['onContentSizeChange'] {
  return useCallback(
    (_width: number, height: number) => measure({ content: height }),
    [measure],
  );
}

type ViewportHandlers = Pick<
  ScrollFadeEdgeHandlers,
  'onLayout' | 'onViewportChange'
>;

function useViewportHandlers({ measure }: MeasuredEdges): ViewportHandlers {
  const onViewportChange = useCallback(
    (height: number) => measure({ viewport: height }),
    [measure],
  );
  const onLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) =>
      onViewportChange(nativeEvent.layout.height),
    [onViewportChange],
  );
  return { onLayout, onViewportChange };
}

// Which edges have content hidden past them, fed by a scroll view's events.
export function useScrollFadeEdges({
  onScroll,
}: {
  onScroll?: ScrollViewProps['onScroll'];
} = {}): ScrollFadeEdgeHandlers {
  const measured = useMeasuredEdges();
  return {
    edges: measured.edges,
    onScroll: useScrollHandler(measured, onScroll),
    onContentSizeChange: useContentSizeHandler(measured),
    ...useViewportHandlers(measured),
  };
}
