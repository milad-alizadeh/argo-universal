import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import { MenuToolbar } from './menu-toolbar.native';

export function PlaceholderPhoneHeader({
  title,
}: {
  title: string;
}): ReactElement {
  return (
    <>
      <Stack.Screen options={{ title }} />
      <MenuToolbar />
    </>
  );
}
