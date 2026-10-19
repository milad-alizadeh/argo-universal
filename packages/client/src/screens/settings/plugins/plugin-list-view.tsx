import type * as React from 'react';
import { RowDrawingContext } from '#lib/generic/row-drawing-context';
import type { IconSymbol } from '#lib/generic/symbols/icon-symbol';
import { Icon } from '#primitives/content/icon';
import { List } from '#primitives/lists/list';
import { ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { type ErrorToast, useErrorToast } from '#primitives/overlays/toast';
import { Page } from '#primitives/scaffolds/page';
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

// One row per Plugin in one card, as iOS Settings lists its Apps: each opens the Plugin's own page.
export function PluginListView(props: PluginListViewProps): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Page title={pluginsTitle} caption={props.caption}>
      <RowDrawingContext value="content">
        <List appearance="grouped">
          <ListSection>{pluginRows(props)}</ListSection>
        </List>
      </RowDrawingContext>
    </Page>
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
    <ListItem.Link
      leading={<Icon name={plugin.icon} role="row" />}
      title={plugin.name}
      onPress={() => onOpen(plugin.pluginId)}
    />
  );
}
