import { SectionMenuButton } from '@repo/client';
import { useNavigation } from 'expo-router';
import { DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';

// ☰ in a JS header, Android's drawer header and the web's stack header, with the attention dot iOS's stock item carries as a badge.
export function DrawerMenuButton(): React.JSX.Element {
  const navigation = useNavigation();

  return (
    <SectionMenuButton
      onOpen={() => navigation.dispatch(DrawerActions.openDrawer())}
    />
  );
}
