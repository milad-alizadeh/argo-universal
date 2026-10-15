import type * as React from 'react';
import { View } from 'react-native';
import { useSectionFilters } from '#features/frame';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { OpenFirstPage } from '#lib/product/navigation/navigation';
import { SettingsNavigationList } from './settings-navigation-list';

// `/settings`: the list of Settings pages the header's search narrows, on a narrow window; a wide window shows the list in the sidebar and opens Accounts.
export function SettingsListScreen(): React.JSX.Element {
  const { settingsQuery } = useSectionFilters();

  if (useWide()) return <OpenFirstPage page="accounts" />;

  return (
    <View className="flex-1 bg-content">
      <SettingsNavigationList query={settingsQuery} />
    </View>
  );
}
