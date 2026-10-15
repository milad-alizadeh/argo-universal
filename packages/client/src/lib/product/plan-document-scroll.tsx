import type * as React from 'react';
import { useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';
import {
  ScrollFadeView,
  type ScrollFadeViewProps,
} from './scroll-fade/scroll-fade';
import type { ScrollFadeOptions } from './scroll-fade/scroll-fade-options';

export interface ScrolledPlanStyle {
  frame: string;
  scroll: string;
  content: string;
  testID: string | undefined;
  label: string;
  // A proposal fades out at its bottom while more of it is hidden below.
  fades: boolean;
  // Grows with its content up to its max height, rather than filling its frame.
  fitContent: boolean;
}

interface PlanScrollMetrics {
  contentHeight: number;
  viewportHeight: number;
  offset: number;
}

interface PlanScrollHandlers {
  onContentSizeChange: (width: number, height: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

interface PlanScroll {
  metrics: PlanScrollMetrics;
  handlers: PlanScrollHandlers;
}

export function usePlanScroll(): PlanScroll {
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [offset, setOffset] = useState(0);

  return {
    metrics: { contentHeight, viewportHeight, offset },
    handlers: {
      onContentSizeChange: (_, height) => setContentHeight(height),
      onLayout: ({ nativeEvent }) =>
        setViewportHeight(nativeEvent.layout.height),
      onScroll: ({ nativeEvent }) => setOffset(nativeEvent.contentOffset.y),
    },
  };
}

const planScrollViewDefaults = {
  role: 'region',
  showsVerticalScrollIndicator: false,
  surfaceClassName: 'bg-card',
} as const;

const fadeEdges = (fades: boolean): ScrollFadeOptions['edges'] => ({
  top: 'never',
  bottom: fades ? 'scrolled' : 'never',
});

interface PlanScrollViewProps {
  style: ScrolledPlanStyle;
  handlers: PlanScrollHandlers;
  children: React.ReactNode;
}

type PlanScrollStyle = Pick<
  ScrollFadeViewProps,
  | 'edges'
  | 'fitContent'
  | 'testID'
  | 'accessibilityLabel'
  | 'className'
  | 'contentContainerClassName'
>;

const scrollViewStyle = (style: ScrolledPlanStyle): PlanScrollStyle => ({
  edges: fadeEdges(style.fades),
  fitContent: style.fitContent,
  testID: style.testID,
  accessibilityLabel: style.label,
  className: style.scroll,
  contentContainerClassName: style.content,
});

export function PlanScrollView(props: PlanScrollViewProps): React.JSX.Element {
  return (
    <ScrollFadeView
      {...planScrollViewDefaults}
      {...scrollViewStyle(props.style)}
      {...props.handlers}
    >
      {props.children}
    </ScrollFadeView>
  );
}

function overflows(metrics: PlanScrollMetrics): boolean {
  return metrics.contentHeight > metrics.viewportHeight + 1;
}

interface ThumbPlacement {
  height: number;
  top: number;
}

function thumbPlacement({
  contentHeight,
  viewportHeight,
  offset,
}: PlanScrollMetrics): ThumbPlacement {
  const height = (viewportHeight * viewportHeight) / Math.max(1, contentHeight);

  return {
    height,
    top:
      (offset * (viewportHeight - height)) / (contentHeight - viewportHeight),
  };
}

export function PlanScrollThumb(props: {
  metrics: PlanScrollMetrics;
}): React.JSX.Element | null {
  if (!overflows(props.metrics)) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      aria-hidden
      className="absolute right-1 w-1 rounded-full bg-foreground/20"
      style={thumbPlacement(props.metrics)}
    />
  );
}
