import type { SystemSymbolSource } from '@repo/contracts/kit-symbols';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List, ListSection } from '@repo/kit/primitives/lists/list';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';

export interface PluginRow {
  pluginId: string;
  name: string;
  icon: SystemSymbolSource;
}

export type PluginsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; plugins: PluginRow[] };

export interface PluginListViewProps {
  caption?: string;
  plugins: PluginsLoad;
  // How many Plugins add to Session rows: the entry row's value. The row is left out until a Plugin can add to them.
  sessionRowPluginCount?: number;
  onOpenPlugin: (pluginId: string) => void;
  onOpenSessionRows?: () => void;
}

export const sessionRowsEntryTitle = 'Session rows';

export const pluginsTitle = 'Plugins';

// One row per Plugin in one card, as iOS Settings lists its Apps: each opens the Plugin's own page.
export function PluginListView(props: PluginListViewProps): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={pluginsTitle} caption={props.caption}>
      <List appearance="grouped">
        <ListSection>{pluginRows(props)}</ListSection>
        {sessionRowsSection(props)}
      </List>
    </Screen>
  );
}

/*
 * Its own card below the Plugins: the Session rows setting is the Server's Plugins taken together, not one Plugin's.
 * Called, not rendered, so the List sees its section.
 */
function sessionRowsSection(
  props: PluginListViewProps,
): React.JSX.Element | null {
  const { onOpenSessionRows, sessionRowPluginCount } = props;

  if (sessionRowPluginCount === undefined || !onOpenSessionRows) return null;

  return (
    <ListSection>
      <FieldGroup.Link
        title={sessionRowsEntryTitle}
        value={`${sessionRowPluginCount} on`}
        onPress={onOpenSessionRows}
      />
    </ListSection>
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

  if (plugins.plugins.length === 0)
    return <FieldGroup.Value title="No Plugins yet." value="" />;

  return plugins.plugins.map((plugin) =>
    pluginItem({ plugin, onOpen: onOpenPlugin }),
  );
}

const loadingPlugins = <FieldGroup.Value title="Loading Plugins…" value="" />;

type PluginItemProps = {
  plugin: PluginRow;
  onOpen: (pluginId: string) => void;
};

/*
 * A Settings row like every other: it pushes the Plugin's page, led by the Plugin's own symbol. It is the FieldGroup
 * row itself, not a component around it, so a phone's grouped List sees a row it can draw natively.
 */
function pluginItem({ plugin, onOpen }: PluginItemProps): React.JSX.Element {
  return (
    <FieldGroup.Link
      key={plugin.pluginId}
      leading={plugin.icon}
      title={plugin.name}
      onPress={() => onOpen(plugin.pluginId)}
    />
  );
}
