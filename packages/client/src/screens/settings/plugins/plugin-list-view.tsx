import type * as React from 'react';
import { View } from 'react-native';
import type { IconSymbol } from '#lib/generic/symbols/icon-symbol';
import { SettingsPage } from '#lib/product/settings-page';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';

export interface PluginRow {
  pluginId: string;
  name: string;
  icon: IconSymbol;
}

export type PluginsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; plugins: PluginRow[] };

export interface PluginListViewProps {
  caption?: string;
  plugins: PluginsLoad;
  onOpenPlugin: (pluginId: string) => void;
}

export const pluginsTitle = 'Plugins';

// One row per Plugin, as iOS Settings lists its Apps: each opens the Plugin's own page.
export function PluginListView(props: PluginListViewProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <SettingsPage title={pluginsTitle} caption={props.caption}>
        <GroupedList>
          <GroupedListSection>
            <PluginRows {...props} />
          </GroupedListSection>
        </GroupedList>
      </SettingsPage>
    </View>
  );
}

const loadFailed: ErrorToast = {
  title: 'Could not load Plugins',
  message: 'The Server did not send its Plugins.',
};

// A failed load keeps the loading row: the toast says why, and the query retries when the Connection reopens.
function PluginRows({
  plugins,
  onOpenPlugin,
}: PluginListViewProps): React.JSX.Element | React.JSX.Element[] {
  useErrorToast(plugins.status === 'error' ? loadFailed : undefined);

  if (plugins.status !== 'loaded')
    return <GroupedListItem label="Loading Plugins…" loading />;

  if (plugins.plugins.length === 0)
    return <GroupedListItem label="No Plugins yet." />;

  return plugins.plugins.map((plugin) => (
    <GroupedListItem
      key={plugin.pluginId}
      icon={plugin.icon}
      label={plugin.name}
      onPress={() => onOpenPlugin(plugin.pluginId)}
    />
  ));
}
