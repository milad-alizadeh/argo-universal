import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from '@legendapp/list/react-native';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/utils';
import { useScrollFadeEdges } from './scroll-fade';

// Legend List's web build hands this to the scroll element as an unknown DOM attribute.
const persistTaps =
  Platform.OS === 'web'
    ? {}
    : { keyboardShouldPersistTaps: 'handled' as const };

export type ScrollFadeListProps<T> = LegendListProps<T> & {
  // The surface colour the content fades into, as for ScrollFade.
  surfaceClassName?: string;
  // Grows with its content up to this height, then scrolls; without it the list fills its parent.
  maxHeight?: number;
};

// A Legend List whose content fades under whichever edge hides more of it.
export function ScrollFadeList<T>({
  surfaceClassName,
  maxHeight,
  onScroll,
  ...props
}: ScrollFadeListProps<T>): React.JSX.Element {
  const fade = useScrollFadeEdges({ surfaceClassName, onScroll });
  const { onContentSizeChange, onViewportChange } = fade;
  const list = useRef<LegendListRef>(null);
  const [contentHeight, setContentHeight] = useState<number>();
  // Legend List's web build never calls onContentSizeChange, and web layout events can miss a popover, so follow the list's own sizes.
  useEffect(() => {
    const state = list.current?.getState();
    if (!state) return;
    const measure = (): void => {
      const current = list.current?.getState();
      if (!current) return;
      setContentHeight(current.contentLength);
      onContentSizeChange(0, current.contentLength);
      // A capped list is exactly as tall as its content, up to the cap.
      if (maxHeight !== undefined)
        onViewportChange(Math.min(current.contentLength, maxHeight));
      else if (current.scrollLength > 0) onViewportChange(current.scrollLength);
    };
    measure();
    const stops = (['totalSize', 'headerSize', 'footerSize'] as const).map(
      (signal) => state.listen(signal, measure),
    );
    return (): void => {
      for (const stop of stops) stop();
    };
  }, [onContentSizeChange, onViewportChange, maxHeight]);
  return (
    <View
      className={cn('relative', maxHeight === undefined && 'flex-1 min-h-0')}
      style={
        maxHeight === undefined
          ? undefined
          : { height: Math.min(contentHeight ?? maxHeight, maxHeight) }
      }
      onLayout={maxHeight === undefined ? fade.onLayout : undefined}
    >
      <LegendList
        ref={list}
        style={{ position: 'absolute', inset: 0 }}
        // Otherwise it shifts the scroll position as rows are measured.
        maintainVisibleContentPosition={false}
        recycleItems={false}
        {...persistTaps}
        {...props}
        onScroll={fade.onScroll}
      />
      {fade.overlays}
    </View>
  );
}
