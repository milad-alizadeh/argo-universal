import type * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewProps,
} from 'react-native';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '#lib/generic/scroll-column';
import { cn } from '#lib/generic/utils';
import { type ScrollFadeEdges, ScrollFadeFrame } from './scroll-fade-frame';

// Which edges have content hidden past them, fed by a scroll view's events.
export function useScrollFadeEdges({
  onScroll,
}: {
  onScroll?: ScrollViewProps['onScroll'];
} = {}): {
  edges: ScrollFadeEdges;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onViewportChange: (height: number) => void;
} {
  const [edges, setEdges] = useState<ScrollFadeEdges>({
    top: false,
    bottom: false,
  });
  const metrics = useRef({ offset: 0, inset: 0, content: 0, viewport: 0 });
  const update = useCallback(() => {
    const { offset, inset, content, viewport } = metrics.current;
    const top = offset + inset > 0;
    const bottom = viewport > 0 && content - offset - viewport > 1;
    setEdges((current) =>
      current.top === top && current.bottom === bottom
        ? current
        : { top, bottom },
    );
  }, []);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { nativeEvent } = event;
      metrics.current = {
        offset: nativeEvent.contentOffset.y,
        inset: nativeEvent.contentInset?.top ?? 0,
        content: nativeEvent.contentSize.height,
        viewport: nativeEvent.layoutMeasurement.height,
      };
      update();
      onScroll?.(event);
    },
    [update, onScroll],
  );
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metrics.current.content = height;
      update();
    },
    [update],
  );
  const onViewportChange = useCallback(
    (height: number) => {
      metrics.current.viewport = height;
      update();
    },
    [update],
  );
  const onLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) =>
      onViewportChange(nativeEvent.layout.height),
    [onViewportChange],
  );
  return {
    edges,
    onScroll: handleScroll,
    onContentSizeChange,
    onLayout,
    onViewportChange,
  };
}

export interface ScrollFadeViewProps extends ScrollViewProps {
  // The surface colour the content fades into, as for ScrollFadeFrame.
  surfaceClassName?: string;
}

// A scroll view whose content fades under the header above it and the edge below it.
export function ScrollFadeView({
  surfaceClassName,
  className,
  onScroll,
  onContentSizeChange,
  onLayout,
  contentContainerStyle,
  ...props
}: ScrollFadeViewProps): React.JSX.Element {
  const fade = useScrollFadeEdges({ onScroll });
  const columnStyle = useScrollColumnStyle(contentContainerStyle);
  return (
    <ScrollFadeFrame
      edges={fade.edges}
      surfaceClassName={surfaceClassName}
      className={cn('min-h-0 flex-1', className)}
    >
      <ScrollColumnContext value={undefined}>
        <ScrollView
          scrollEventThrottle={16}
          {...props}
          contentContainerStyle={columnStyle}
          className="flex-1"
          onScroll={fade.onScroll}
          onContentSizeChange={(width, height) => {
            fade.onContentSizeChange(width, height);
            onContentSizeChange?.(width, height);
          }}
          onLayout={(event) => {
            fade.onLayout(event);
            onLayout?.(event);
          }}
        />
      </ScrollColumnContext>
    </ScrollFadeFrame>
  );
}

// The Sessions list and Session page still place their own fades until the Session change.
export { ScrollFade } from './scroll-fade-overlay';
