import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useResolveClassNames } from 'uniwind';

export interface ScrollFadeProps {
  edge: 'top' | 'bottom';
  // The surface colour the content fades into.
  className?: string;
}

// A short gradient from the surface colour to transparent where a list meets its edge.
export function ScrollFade({
  edge,
  className = 'bg-background',
}: ScrollFadeProps) {
  const gradientId = `${useId().replace(/:/g, '')}-${edge}`;
  const { backgroundColor } = useResolveClassNames(className);
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={`scroll-fade-${edge}`}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 10,
        height: edge === 'top' ? 20 : 28,
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
    </View>
  );
}
