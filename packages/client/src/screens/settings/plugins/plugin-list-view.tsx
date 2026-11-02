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

// A Slot's page, entered from its own row; `count` is how many Plugins are on in it.
export interface SlotLink {
  slotId: string;
  title: string;
  count: number;
}

export interface PluginListViewProps {
  plugins: PluginsLoad;
  // The Slots some Plugin fills; a Slot no Plugin fills has no row.
  slots: readonly SlotLink[];
  onOpenPlugin: (pluginId: string) => void;
  onOpenSlot: (slotId: string) => void;
}

const pluginsTitle = 'Plugins';

// One row per Plugin in one card, as iOS Settings lists its Apps: each opens the Plugin's own page.
export function PluginListView(props: PluginListViewProps): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={pluginsTitle}>
      <List appearance="grouped">
        <ListSection>{pluginRows(props)}</ListSection>
        {slotsSection(props)}
      </List>
    </Screen>
  );
}

/*
 * Their own card below the Plugins: a Slot's page is the Server's Plugins taken together, not one Plugin's.
 * Called, not rendered, so the List sees its section.
 */
function slotsSection({
  slots,
  onOpenSlot,
}: PluginListViewProps): React.JSX.Element | null {
  if (slots.length === 0) return null;

  return (
    <ListSection>{slots.map((slot) => slotRow(slot, onOpenSlot))}</ListSection>
  );
}

const slotRow = (
  slot: SlotLink,
  onOpen: (slotId: string) => void,
): React.JSX.Element => (
  <FieldGroup.Link
    key={slot.slotId}
    title={slot.title}
    value={`${slot.count} on`}
    onPress={() => onOpen(slot.slotId)}
  />
);

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
 * row itself, not a component around it, so a grouped List on iOS or Android sees a row it can draw natively.
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
