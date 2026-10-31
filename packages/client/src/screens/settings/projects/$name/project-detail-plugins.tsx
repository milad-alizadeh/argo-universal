import type { ProjectDetailsItem } from '@repo/contracts/plugins/wire';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { pluginSymbol } from '../../../../lib/product/plugin-symbol';
import type { ReadItem } from '../../../plugins/slot-items';

// Opens the Plugin page a row drills into (ADR-0046); a row with no action never calls it.
export type OpenPluginPage = (pluginId: string, path: string) => void;

type Read = ReadItem<ProjectDetailsItem>;

type Row = { read: Read; rowKey: string; onOpen: OpenPluginPage | undefined };

// Each Plugin's rows together, in the order the Slot answered, so each Plugin gets one section.
function byPlugin(items: readonly Read[]): [pluginId: string, read: Read[]][] {
  const grouped = new Map<string, Read[]>();

  for (const read of items)
    grouped.set(read.pluginId, [...(grouped.get(read.pluginId) ?? []), read]);

  return [...grouped];
}

/*
 * One titled section per Plugin, named after the Plugin, each of its items a row of its own (ADR-0046): the section
 * draws the separators and row metrics, as it does for Argo's own rows. FieldGroup finds its sections by element
 * type, so each is an element built here, not a component.
 */
export function pluginSections(
  items: readonly Read[],
  onOpen: OpenPluginPage | undefined,
): React.JSX.Element[] {
  return byPlugin(items).map(([pluginId, read]) => (
    <FieldGroup.Section key={pluginId} title={read[0]?.pluginName}>
      {read.map((row, index) =>
        pluginRow({ read: row, rowKey: `${pluginId}-${index}`, onOpen }),
      )}
    </FieldGroup.Section>
  ));
}

// A row that drills into one of the Plugin's own pages, or a plain value when the item has no action.
function pluginRow(row: Row): React.JSX.Element {
  const { item } = row.read;

  return item.action ? (
    drillInRow(row, item.action.path)
  ) : (
    <FieldGroup.Value
      key={row.rowKey}
      title={item.title}
      value={item.value ?? ''}
    />
  );
}

// The row the item's `action` opens a page from, with the Plugin's own glyph when it sent one.
function drillInRow(
  { read, rowKey, onOpen }: Row,
  path: string,
): React.JSX.Element {
  const { pluginId, item } = read;

  return (
    <FieldGroup.Link
      key={rowKey}
      title={item.title}
      value={item.value}
      {...(item.icon && { leading: pluginSymbol(item.icon) })}
      onPress={() => onOpen?.(pluginId, path)}
    />
  );
}
