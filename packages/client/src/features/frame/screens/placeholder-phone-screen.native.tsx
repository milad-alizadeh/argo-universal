import { Stack } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import type { Section } from '../../../lib/product/navigation/sections';
import { MenuToolbar } from '../components/menu-toolbar.native';
import { shellSections } from '../components/shell-sections';
import { PlaceholderList } from './section-list';

export interface PlaceholderPhoneScreenProps {
  section: Section;
}

// A phone section root whose list is not built yet: ☰ and the title over a placeholder.
export function PlaceholderPhoneScreen({
  section,
}: PlaceholderPhoneScreenProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <Stack.Screen options={{ title: shellSections[section].title }} />
      <MenuToolbar />
      <PlaceholderList section={section} />
    </View>
  );
}
