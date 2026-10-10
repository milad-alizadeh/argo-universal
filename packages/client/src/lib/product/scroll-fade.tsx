import type * as React from 'react';
import { useCallback, useId, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  type ScrollViewProps,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { bezierEasing, easingCurve, motionDuration } from '#lib/generic/motion';
import { cn } from '#lib/generic/utils';

export interface ScrollFadeProps {
  edge: 'top' | 'bottom';
  // The surface colour the content fades into.
  className?: string;
  height?: number;
}

export const scrollFadeHeight = { top: 28, bottom: 36 } as const;

const fadeEasing = bezierEasing(easingCurve.standard);
const [fadeIn, fadeOut] = [FadeIn, FadeOut].map((animation) =>
  animation
    .duration(motionDuration.enter)
    .easing(fadeEasing)
    .reduceMotion(ReduceMotion.System),
);

// A gradient from the surface colour to transparent where a list meets its edge; it fades in and out.
export function ScrollFade({
  edge,
  className = 'bg-background',
  height,
}: ScrollFadeProps): React.JSX.Element {
  const gradientId = `${useId().replace(/:/g, '')}-${edge}`;
  const { backgroundColor } = useResolveClassNames(className);
  return (
    <Animated.View
      entering={fadeIn}
      exiting={fadeOut}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`scroll-fade-${edge}`}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        height: height ?? scrollFadeHeight[edge],
        ...(edge === 'top' ? { top: 0 } : { bottom: 0 }),
      }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0%" x2="0" y2="100%">
            <Stop
              offset="0"
              stopColor={backgroundColor}
              stopOpacity={edge === 'top' ? 1 : 0}
            />
            <Stop offset="0.5" stopColor={backgroundColor} stopOpacity={0.85} />
            <Stop
              offset="1"
              stopColor={backgroundColor}
              stopOpacity={edge === 'top' ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </Animated.View>
  );
}

// Which edges have content hidden past them, fed by a scroll view's events.
export function useScrollFadeEdges({
  surfaceClassName,
  onScroll,
}: {
  surfaceClassName?: string;
  onScroll?: ScrollViewProps['onScroll'];
} = {}): {
  edges: { top: boolean; bottom: boolean };
  overlays: React.JSX.Element;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onContentSizeChange: (width: number, height: number) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onViewportChange: (height: number) => void;
} {
  const [edges, setEdges] = useState({ top: false, bottom: false });
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
    overlays: (
      <>
        {edges.top && <ScrollFade edge="top" className={surfaceClassName} />}
        {edges.bottom && (
          <ScrollFade edge="bottom" className={surfaceClassName} />
        )}
      </>
    ),
    onScroll: handleScroll,
    onContentSizeChange,
    onLayout,
    onViewportChange,
  };
}

export interface ScrollFadeViewProps extends ScrollViewProps {
  // The surface colour the content fades into, as for ScrollFade.
  surfaceClassName?: string;
}

// A scroll view whose content fades under the header above it and the edge below it.
export function ScrollFadeView({
  surfaceClassName,
  className,
  onScroll,
  onContentSizeChange,
  onLayout,
  ...props
}: ScrollFadeViewProps): React.JSX.Element {
  const fade = useScrollFadeEdges({ surfaceClassName, onScroll });
  return (
    <View className={cn('relative min-h-0 flex-1', className)}>
      <ScrollView
        scrollEventThrottle={16}
        {...props}
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
      {fade.overlays}
    </View>
  );
}
