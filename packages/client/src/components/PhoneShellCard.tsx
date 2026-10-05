import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
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
  const inset = Number(marginTop);
  const radius = Number(borderRadius);
  const animatedStyle = useAnimatedStyle(() => ({
    marginTop: inset * progress.value,
    marginBottom: inset * progress.value,
    borderRadius: radius * progress.value,
  }));

  return (
    <Animated.View
      testID="phone-shell-card"
      className="flex-1 bg-card shadow-card"
      style={animatedStyle}
    >
      {children}
    </Animated.View>
  );
}
