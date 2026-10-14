import type * as React from 'react';
import { useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native';
import { ScrollFadeGradient } from '#lib/generic/scroll-fade/index';

export interface ScrolledPlanStyle {
  frame: string;
  scroll: string;
  content: string;
  testID: string | undefined;
  label: string;
  // A proposal fades out at its bottom while more of it is hidden below.
  fades: boolean;
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
  scrollEventThrottle: 16,
} as const;

interface PlanScrollViewProps {
  style: ScrolledPlanStyle;
  handlers: PlanScrollHandlers;
  children: React.ReactNode;
}

export function PlanScrollView(props: PlanScrollViewProps): React.JSX.Element {
  return (
    <ScrollView
      {...planScrollViewDefaults}
      testID={props.style.testID}
      accessibilityLabel={props.style.label}
      className={props.style.scroll}
      contentContainerClassName={props.style.content}
      {...props.handlers}
    >
      {props.children}
    </ScrollView>
  );
}

function overflows(metrics: PlanScrollMetrics): boolean {
  return metrics.contentHeight > metrics.viewportHeight + 1;
}

function hiddenBelow(metrics: PlanScrollMetrics): number {
  return metrics.contentHeight - metrics.viewportHeight - metrics.offset;
}

export function PlanBottomFade(props: {
  metrics: PlanScrollMetrics;
}): React.JSX.Element | null {
  if (!overflows(props.metrics) || hiddenBelow(props.metrics) <= 1) return null;

  return <ScrollFadeGradient edge="bottom" className="bg-card" height={40} />;
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
