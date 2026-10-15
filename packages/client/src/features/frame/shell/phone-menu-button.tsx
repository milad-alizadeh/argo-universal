import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';

// ☰ at the leading edge of a narrow web window's section header, which is the section stack's own header; it opens the drawer of sections. Attention shows on the drawer's Sessions row, not here. Phones show the stock DrawerToggleButton.
export function PhoneMenuButton(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <HeaderButton
      icon="menu"
      accessibilityLabel="Open navigation"
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}
