import { Stack } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { SettingsNavigationList } from '#features/settings';
import { MenuToolbar } from '../components/menu-toolbar.native';
import { shellSections } from '../components/shell-sections';

// A phone's Settings root: ☰ and the title over the list of Settings pages.
export function SettingsPhoneScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <Stack.Screen options={{ title: shellSections.settings.title }} />
      <MenuToolbar />
      <SettingsNavigationList query="" />
    </View>
  );
}
