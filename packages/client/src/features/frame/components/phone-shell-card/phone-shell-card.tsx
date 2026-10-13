import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useDrawerProgress } from 'react-native-drawer-layout';
import Animated, {
  interpolate,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useResolveClassNames } from 'uniwind';

export interface PhoneShellCardProps {
  drawerOpen: boolean;
  children: ReactNode;
}

// How much of the screen still shows through under the open drawer.
const dimmedOpacity = 0.5;

// A card-coloured veil, not opacity: UIKit's glass breaks inside a faded view.
function DrawerVeil(): React.JSX.Element {
  const progress = useDrawerProgress();
  // Resolved here: the Reanimated veil would not paint the class's colour.
  const card = useResolveClassNames('bg-sidebar');
  // Fades the screen into the card in step with the drawer, whether dragged, flung or tapped.
  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1 - dimmedOpacity]),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      className="absolute inset-0"
      style={[card, veilStyle]}
    />
  );
}

export function PhoneShellCard({
  children,
}: PhoneShellCardProps): React.JSX.Element {
  const card = useResolveClassNames('bg-sidebar');
  // No scale: UIKit measures a stack's safe area through transforms, so a section mounted under a scaled card gets its header wrong.
  return (
    <View testID="phone-shell-card" className="flex-1" style={card}>
      {children}
      <DrawerVeil />
    </View>
  );
}
