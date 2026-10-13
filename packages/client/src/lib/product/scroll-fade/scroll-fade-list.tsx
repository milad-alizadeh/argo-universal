import {
  LegendList,
  type LegendListProps,
  type LegendListRef,
} from '@legendapp/list/react-native';
import type * as React from 'react';
import { type ReactNode, type RefObject, useRef } from 'react';
import { Platform } from 'react-native';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '#lib/generic/scroll-column';
import {
  type ScrollFadeEdgeHandlers,
  useScrollFadeEdges,
} from './scroll-fade-edges';
import {
  ScrollFadeFrame,
  type ScrollFadeFrameProps,
} from './scroll-fade-frame';
import { useFollowListSizes } from './scroll-fade-list-sizes';

// Legend List's web build hands this to the scroll element as an unknown DOM attribute.
const persistTaps =
  Platform.OS === 'web'
    ? {}
    : { keyboardShouldPersistTaps: 'handled' as const };

const legendListDefaults = {
  style: { position: 'absolute', inset: 0 },
  // Otherwise it shifts the scroll position as rows are measured.
  maintainVisibleContentPosition: false,
  recycleItems: false,
  ...persistTaps,
} as const;

// A list that leaves its edges to the platform fades neither.
const noEdges = { top: false, bottom: false };

export type ScrollFadeListProps<T> = LegendListProps<T> & {
  // The surface colour the content fades into, as for ScrollFadeFrame.
  surfaceClassName?: string;
  // Grows with its content up to this height, then scrolls; without it the list fills its parent.
  maxHeight?: number;
  // False where the platform fades the edges itself, as iOS does under its glass bars.
  fade?: boolean;
};

type ListFadeOptions = Pick<
  ScrollFadeListProps<unknown>,
  'surfaceClassName' | 'maxHeight' | 'fade'
>;

// A Legend List whose content fades under whichever edge hides more of it.
export function ScrollFadeList<T>({
  surfaceClassName,
  maxHeight,
  fade,
  ...props
}: ScrollFadeListProps<T>): React.JSX.Element {
  const list = useRef<LegendListRef>(null);
  const options = { surfaceClassName, maxHeight, fade };
  const { frame, onScroll } = useListFadeFrame(list, options, props.onScroll);
  return (
    <ScrollFadeFrame {...frame}>
      <FadingLegendList {...props} ref={list} onScroll={onScroll} />
    </ScrollFadeFrame>
  );
}

type ListFrame = Omit<ScrollFadeFrameProps, 'children'>;

function useListFadeFrame(
  list: RefObject<LegendListRef | null>,
  options: ListFadeOptions,
  onScroll: LegendListProps<unknown>['onScroll'],
): { frame: ListFrame; onScroll: ScrollFadeEdgeHandlers['onScroll'] } {
  const fade = useScrollFadeEdges({ onScroll });
  const contentHeight = useFollowListSizes(list, fade, options.maxHeight);
  return {
    frame: listFrame({ options, fade, contentHeight }),
    onScroll: fade.onScroll,
  };
}

function listFrame({
  options,
  fade,
  contentHeight,
}: {
  options: ListFadeOptions;
  fade: ScrollFadeEdgeHandlers;
  contentHeight: number | undefined;
}): ListFrame {
  return {
    edges: options.fade === false ? noEdges : fade.edges,
    surfaceClassName: options.surfaceClassName,
    ...cappedFrame(options.maxHeight, contentHeight, fade.onLayout),
  };
}

// A capped list is as tall as its content up to the cap; an uncapped one fills its parent and measures it.
function cappedFrame(
  maxHeight: number | undefined,
  contentHeight: number | undefined,
  onLayout: ScrollFadeEdgeHandlers['onLayout'],
): Pick<ListFrame, 'className' | 'style' | 'onLayout'> {
  if (maxHeight === undefined) return { className: 'flex-1 min-h-0', onLayout };
  return {
    className: '',
    style: { height: Math.min(contentHeight ?? maxHeight, maxHeight) },
  };
}

type FadingLegendListProps<T> = LegendListProps<T> & {
  ref: RefObject<LegendListRef | null>;
};

// It takes the pane's column for its content, then clears it for everything inside.
function FadingLegendList<T>(props: FadingLegendListProps<T>): ReactNode {
  const columnStyle = useScrollColumnStyle(props.contentContainerStyle);
  return (
    <ScrollColumnContext value={undefined}>
      <LegendList
        {...legendListDefaults}
        {...props}
        contentContainerStyle={columnStyle}
      />
    </ScrollColumnContext>
  );
}
