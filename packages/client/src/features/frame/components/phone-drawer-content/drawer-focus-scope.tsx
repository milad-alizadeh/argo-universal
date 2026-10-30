import type * as React from 'react';
import { View } from 'react-native';

export interface DrawerFocusScopeProps {
  open: boolean;
  children: React.ReactNode;
}

// Native screen readers and focus follow the drawer's own accessibility props, so only the web scope manages a Tab order.
export function DrawerFocusScope({
  open,
  children,
}: DrawerFocusScopeProps): React.JSX.Element {
  return (
    <View
      className="flex-1"
      aria-hidden={!open}
      accessibilityElementsHidden={!open}
    >
      {children}
    </View>
  );
}
