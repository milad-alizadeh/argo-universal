import { groupedOnPhones } from '@repo/kit/list-grouped';
import { Icon } from '@repo/kit/primitives/content/icon';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type { IconSymbol } from '@repo/kit/symbols/icon-symbol';
import type * as React from 'react';

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

// One row per Plugin in one card, as iOS Settings lists its Apps: each opens the Plugin's own page.
export function PluginListView(props: PluginListViewProps): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={pluginsTitle} caption={props.caption}>
      <List appearance={groupedOnPhones('cards')}>
        <ListSection>{pluginRows(props)}</ListSection>
      </List>
    </Screen>
  );
}

const loadFailed: ErrorToast = {
  title: 'Could not load Plugins',
  message: 'The Server did not send its Plugins.',
};

/*
 * The section's rows as its own children, so the card knows its first and last row. A failed load keeps the loading
 * row: the toast says why, and the query retries when the Connection reopens.
 */
function pluginRows({
  plugins,
  onOpenPlugin,
}: PluginListViewProps): React.JSX.Element | React.JSX.Element[] {
  if (plugins.status !== 'loaded') return loadingPlugins;

  if (plugins.plugins.length === 0) return <ListItem title="No Plugins yet." />;

  return plugins.plugins.map((plugin) => (
    <PluginItem key={plugin.pluginId} plugin={plugin} onOpen={onOpenPlugin} />
  ));
}

const loadingPlugins = (
  <ListItem
    title="Loading Plugins…"
    leading={<Spinner accessibilityLabel="Loading" />}
  />
);

type PluginItemProps = {
  plugin: PluginRow;
  onOpen: (pluginId: string) => void;
};

// Paper's Plugins page: each row pushes the Plugin's page, so it draws the disclosure chevron.
function PluginItem({ plugin, onOpen }: PluginItemProps): React.JSX.Element {
  return (
    <ListItem
      disclosure
      role="link"
      leading={<Icon name={plugin.icon} size="md" />}
      title={plugin.name}
      onPress={() => onOpen(plugin.pluginId)}
    />
  );
}
