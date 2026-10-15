import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { SettingsNavigationList } from '#features/settings';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { shellSections } from '../components/shell-sections';
import { PhoneMenuButton } from './phone-menu-button';

// A narrow window's Settings root: its header with ☰, the title and search, over the list of Settings pages the search narrows.
export function SettingsPhoneScreen(): React.JSX.Element {
  const [query, setQuery] = useState('');

  return (
    <View className="flex-1 bg-content">
      <ScreenHeader
        title={shellSections.settings.title}
        left={<PhoneMenuButton />}
        search={{ placeholder: 'Search Settings', onChangeText: setQuery }}
      />
      <SettingsNavigationList query={query} />
    </View>
  );
}
