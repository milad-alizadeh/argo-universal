import type { LegendListRef } from '@legendapp/list/react-native';
import { type RefObject, useCallback, useEffect, useState } from 'react';
import type { ScrollFadeEdgeHandlers } from './scroll-fade-edges';

type ListState = ReturnType<LegendListRef['getState']>;
type SizeHandlers = Pick<
  ScrollFadeEdgeHandlers,
  'onContentSizeChange' | 'onViewportChange'
>;

const sizeSignals = ['totalSize', 'headerSize', 'footerSize'] as const;

// A capped list is exactly as tall as its content, up to the cap.
function viewportOf(
  state: ListState,
  maxHeight: number | undefined,
): number | undefined {
  if (maxHeight !== undefined) return Math.min(state.contentLength, maxHeight);
  return state.scrollLength > 0 ? state.scrollLength : undefined;
}

function reportSizes(
  state: ListState,
  handlers: SizeHandlers,
  maxHeight: number | undefined,
): void {
  handlers.onContentSizeChange(0, state.contentLength);
  const viewport = viewportOf(state, maxHeight);
  if (viewport !== undefined) handlers.onViewportChange(viewport);
}

const measureLatest =
  (list: RefObject<LegendListRef | null>, report: (state: ListState) => void) =>
  (): void => {
    const state = list.current?.getState();
    if (state) report(state);
  };

const stopAll = (stops: (() => void)[]) => (): void => {
  for (const stop of stops) stop();
};

function followSizes(
  list: RefObject<LegendListRef | null>,
  report: (state: ListState) => void,
): (() => void) | undefined {
  const state = list.current?.getState();
  if (!state) return undefined;
  const measure = measureLatest(list, report);
  measure();
  return stopAll(sizeSignals.map((signal) => state.listen(signal, measure)));
}

// Legend List's web build never calls onContentSizeChange, and web layout events can miss a popover, so follow the list's own sizes.
export function useFollowListSizes(
  list: RefObject<LegendListRef | null>,
  fade: SizeHandlers,
  maxHeight: number | undefined,
): number | undefined {
  const [contentHeight, setContentHeight] = useState<number>();
  const report = useSizeReport(fade, maxHeight, setContentHeight);
  useEffect(() => followSizes(list, report), [list, report]);
  return contentHeight;
}

function useSizeReport(
  { onContentSizeChange, onViewportChange }: SizeHandlers,
  maxHeight: number | undefined,
  onContentHeight: (height: number) => void,
): (state: ListState) => void {
  return useCallback(
    (state: ListState) => {
      onContentHeight(state.contentLength);
      reportSizes(state, { onContentSizeChange, onViewportChange }, maxHeight);
    },
    [onContentHeight, onContentSizeChange, onViewportChange, maxHeight],
  );
}
