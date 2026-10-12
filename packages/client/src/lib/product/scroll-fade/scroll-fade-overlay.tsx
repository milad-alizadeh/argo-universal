import type * as React from 'react';
import { useId } from 'react';
import { View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ReduceMotion,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';
import { bezierEasing, easingCurve, motionDuration } from '#lib/generic/motion';

export interface ScrollFadeProps {
  edge: 'top' | 'bottom';
  // The surface colour the content fades into.
  className?: string;
  height?: number;
  // How far something covers the list at this edge: the gradient ends there, and the surface fills the rest.
  inset?: number;
}

// How deep content fades at each edge unless a caller says otherwise.
export const scrollFadeDepth = { top: 28, bottom: 36 } as const;

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
  className = 'bg-sidebar',
  height,
  inset = 0,
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
        height: (height ?? scrollFadeDepth[edge]) + inset,
        flexDirection: edge === 'top' ? 'column-reverse' : 'column',
        ...(edge === 'top' ? { top: 0 } : { bottom: 0 }),
      }}
    >
      <View style={{ flex: 1 }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0%" x2="0" y2="100%">
              <Stop
                offset="0"
                stopColor={backgroundColor}
                stopOpacity={edge === 'top' ? 1 : 0}
              />
              <Stop
                offset="0.5"
                stopColor={backgroundColor}
                stopOpacity={0.85}
              />
              <Stop
                offset="1"
                stopColor={backgroundColor}
                stopOpacity={edge === 'top' ? 0 : 1}
              />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
      {inset > 0 && <View style={{ height: inset, backgroundColor }} />}
    </Animated.View>
  );
}
