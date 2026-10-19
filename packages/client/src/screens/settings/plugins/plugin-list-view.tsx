import type * as React from 'react';
import { View } from 'react-native';
import type { IconSymbol } from '#lib/generic/symbols/icon-symbol';
import { SettingsPage } from '#lib/product/settings-page';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { Spinner } from '#primitives/status/spinner';

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
        <List appearance="grouped">
          <ListSection>
            <PluginRows {...props} />
          </ListSection>
        </List>
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
}: PluginListViewProps): React.JSX.Element {
  useErrorToast(plugins.status === 'error' ? loadFailed : undefined);

  if (plugins.status !== 'loaded')
    return (
      <ListItem
        title="Loading Plugins…"
        leading={<Spinner accessibilityLabel="Loading" />}
      />
    );

  return <LoadedPlugins rows={plugins.plugins} onOpenPlugin={onOpenPlugin} />;
}

type LoadedPluginsProps = Pick<PluginListViewProps, 'onOpenPlugin'> & {
  rows: PluginRow[];
};

function LoadedPlugins({
  rows,
  onOpenPlugin,
}: LoadedPluginsProps): React.JSX.Element | React.JSX.Element[] {
  if (rows.length === 0) return <ListItem title="No Plugins yet." />;

  return rows.map((plugin) => (
    <PluginItem key={plugin.pluginId} plugin={plugin} onOpen={onOpenPlugin} />
  ));
}

type PluginItemProps = {
  plugin: PluginRow;
  onOpen: (pluginId: string) => void;
};

function PluginItem({ plugin, onOpen }: PluginItemProps): React.JSX.Element {
  return (
    <ListItem
      leading={<Icon name={plugin.icon} role="row" />}
      title={plugin.name}
      onPress={() => onOpen(plugin.pluginId)}
    />
  );
}
