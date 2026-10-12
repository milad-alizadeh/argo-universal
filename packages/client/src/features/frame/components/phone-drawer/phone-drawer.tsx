import type * as React from 'react';
import type { ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';

export interface PhoneDrawerProps {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  width: number;
  surfaceStyle: ViewStyle;
  layout: { width: number; height: number };
  // Off away from a section root, so the edge swipe goes back instead.
  swipeEnabled?: boolean;
  renderDrawerContent: () => ReactNode;
  children: ReactNode;
}

export function PhoneDrawer({
  width,
  surfaceStyle: _surfaceStyle,
  swipeEnabled = true,
  ...props
}: PhoneDrawerProps): React.JSX.Element {
  return (
    <Drawer
      {...props}
      swipeEnabled={swipeEnabled}
      drawerType="back"
      drawerPosition="left"
      // The shell's themed chrome shows through; a resolved colour here misses the theme on web.
      drawerStyle={{ backgroundColor: 'transparent', width }}
      overlayStyle={{ backgroundColor: 'transparent' }}
      overlayAccessibilityLabel="Close navigation"
    />
  );
}
