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
  renderDrawerContent: () => ReactNode;
  children: ReactNode;
}

export function PhoneDrawer({
  width,
  surfaceStyle,
  ...props
}: PhoneDrawerProps) {
  return (
    <Drawer
      {...props}
      drawerType="back"
      drawerPosition="left"
      drawerStyle={[surfaceStyle, { width }]}
      overlayStyle={{ backgroundColor: 'transparent' }}
      overlayAccessibilityLabel="Close navigation"
    />
  );
}
