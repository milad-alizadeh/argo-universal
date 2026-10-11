import type * as React from 'react';
import type { ReactNode } from 'react';
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

export function PhoneShellCard({
  children,
}: PhoneShellCardProps): React.JSX.Element {
  const progress = useDrawerProgress();
  const { borderRadius } = useResolveClassNames('rounded-xl');
  // Resolved here: the Reanimated views below would not paint the class's colour.
  const card = useResolveClassNames('bg-card');
  const radius = Number(borderRadius);
  const cornerStyle = useAnimatedStyle(() => ({
    borderRadius: radius * progress.value,
  }));
  // Fades the screen into the card in step with the drawer, whether dragged, flung or tapped.
  const veilStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1 - dimmedOpacity]),
  }));

  // No scale: UIKit measures a stack's safe area through transforms, so a section mounted under a scaled card gets its header wrong.
  return (
    <Animated.View
      testID="phone-shell-card"
      className="flex-1 shadow-card"
      style={[card, cornerStyle]}
    >
      {/* Clips the screens inside, whose own backgrounds would square the corners. */}
      <Animated.View
        className="flex-1 overflow-hidden"
        style={[card, cornerStyle]}
      >
        {children}
        {/* A card-coloured veil, not opacity: UIKit's glass breaks inside a faded view. */}
        <Animated.View
          pointerEvents="none"
          className="absolute inset-0"
          style={[card, veilStyle]}
        />
      </Animated.View>
    </Animated.View>
  );
}
