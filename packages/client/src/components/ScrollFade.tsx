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
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/utils';

export interface ScrollFadeProps {
  edge: 'top' | 'bottom';
  // The surface colour the content fades into.
  className?: string;
}

export const scrollFadeHeight = { top: 28, bottom: 36 } as const;

// The ease iOS uses when a transparent header gains its scroll edge.
const fadeEasing = Easing.bezier(0.25, 0.1, 0.25, 1);
const fadeIn = FadeIn.duration(200)
  .easing(fadeEasing)
  .reduceMotion(ReduceMotion.System);
const fadeOut = FadeOut.duration(200)
  .easing(fadeEasing)
  .reduceMotion(ReduceMotion.System);

// A gradient from the surface colour to transparent where a list meets its edge; it fades in and out.
export function ScrollFade({
  edge,
  className = 'bg-background',
}: ScrollFadeProps) {
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
        height: scrollFadeHeight[edge],
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
export function useScrollFadeEdges() {
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
  const onScroll = useCallback(
    ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      metrics.current = {
        offset: nativeEvent.contentOffset.y,
        inset: nativeEvent.contentInset?.top ?? 0,
        content: nativeEvent.contentSize.height,
        viewport: nativeEvent.layoutMeasurement.height,
      };
      update();
    },
    [update],
  );
  const onContentSizeChange = useCallback(
    (_width: number, height: number) => {
      metrics.current.content = height;
      update();
    },
    [update],
  );
  const onLayout = useCallback(
    ({ nativeEvent }: LayoutChangeEvent) => {
      metrics.current.viewport = nativeEvent.layout.height;
      update();
    },
    [update],
  );
  return { edges, onScroll, onContentSizeChange, onLayout };
}

export interface ScrollFadeViewProps extends ScrollViewProps {
  // The surface colour the content fades into, as for ScrollFade.
  surfaceClassName?: string;
  // Classes for the scroll view itself; className sizes the frame around it.
  scrollClassName?: string;
}

// A scroll view whose content fades under the header above it and the edge below it.
export function ScrollFadeView({
  surfaceClassName,
  className,
  scrollClassName,
  onScroll,
  onContentSizeChange,
  onLayout,
  ...props
}: ScrollFadeViewProps) {
  const fade = useScrollFadeEdges();
  return (
    <View className={cn('relative min-h-0 flex-1', className)}>
      <ScrollView
        scrollEventThrottle={16}
        {...props}
        className={scrollClassName}
        onScroll={(event) => {
          fade.onScroll(event);
          onScroll?.(event);
        }}
        onContentSizeChange={(width, height) => {
          fade.onContentSizeChange(width, height);
          onContentSizeChange?.(width, height);
        }}
        onLayout={(event) => {
          fade.onLayout(event);
          onLayout?.(event);
        }}
      />
      {fade.edges.top && <ScrollFade edge="top" className={surfaceClassName} />}
      {fade.edges.bottom && (
        <ScrollFade edge="bottom" className={surfaceClassName} />
      )}
    </View>
  );
}
