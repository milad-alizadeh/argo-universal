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

export interface ScrolledPlanStyle {
  frame: string;
  scroll: string;
  content: string;
  label: string;
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

// The plan grows with its content up to its max height, with no fades.
const planScrollViewDefaults = {
  role: 'region',
  showsVerticalScrollIndicator: false,
  surfaceClassName: 'bg-card',
  edges: { top: 'never', bottom: 'never' },
  fitContent: true,
} as const;

interface PlanScrollViewProps {
  style: ScrolledPlanStyle;
  handlers: PlanScrollHandlers;
  children: React.ReactNode;
}

type PlanScrollStyle = Pick<
  ScrollFadeViewProps,
  'accessibilityLabel' | 'className' | 'contentContainerClassName'
>;

const scrollViewStyle = (style: ScrolledPlanStyle): PlanScrollStyle => ({
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
