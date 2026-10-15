import type * as React from 'react';
import { View } from 'react-native';
import { SettingsNavigationList } from '#features/settings';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PhoneMenuButton } from '../components/phone-menu-button';
import { shellSections } from '../components/shell-sections';

// A narrow web window's Settings root: its header row with ☰ and the title, over the list of Settings pages.
export function SettingsPhoneScreen(): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      <ScreenHeader
        title={shellSections.settings.title}
        left={<PhoneMenuButton />}
      />
      <SettingsNavigationList query="" />
    </View>
  );
}
