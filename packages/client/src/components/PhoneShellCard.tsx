import type { ReactNode } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useDrawerProgress } from 'react-native-drawer-layout';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';

export interface PhoneShellCardProps {
  drawerOpen: boolean;
  children: ReactNode;
}

export function PhoneShellCard({ children }: PhoneShellCardProps) {
  const progress = useDrawerProgress();
  const { marginTop, borderRadius } = useResolveClassNames(
    'mt-3 rounded-xl',
  ) as ViewStyle;
  const radius = Number(borderRadius);
  // Scaling about the left edge insets the card top and bottom by mt-3 without a layout pass.
  const shrink = (2 * Number(marginTop)) / useWindowDimensions().height;
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - shrink * progress.value }],
  }));
  const cornerStyle = useAnimatedStyle(() => ({
    borderRadius: radius * progress.value,
  }));

  return (
    <Animated.View
      testID="phone-shell-card"
      className="flex-1 bg-card shadow-card"
      style={[{ transformOrigin: 'left center' }, scaleStyle, cornerStyle]}
    >
      {/* Clips the screens inside, whose own backgrounds would square the corners. */}
      <Animated.View
        className="flex-1 overflow-hidden bg-card"
        style={cornerStyle}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}
