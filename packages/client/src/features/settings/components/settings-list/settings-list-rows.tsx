import type * as React from 'react';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { hrefFor } from '#lib/product/navigation/routes';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SettingsListProps, SettingsRow } from './settings-list-props';

type Selection = Pick<SettingsListProps, 'selectedDestination' | 'onSelect'>;

type RowsProps = Selection & { rows: SettingsRow[] };

// A section takes each child as one row, so the rows are returned as elements, not one component.
export function settingsRowItems({
  rows,
  ...selection
}: RowsProps): React.JSX.Element[] {
  return rows.map((row) => (
    <SettingsRowItem key={row.label} row={row} {...selection} />
  ));
}

function SettingsRowItem({
  row,
  selectedDestination,
  onSelect,
}: Selection & { row: SettingsRow }): React.JSX.Element {
  const wide = useWide();

  return (
    <GroupedListItem
      {...row}
      href={hrefFor(row.destination).pathname}
      selected={wide && selectedRow(row.destination, selectedDestination)}
      onPress={() => onSelect(row.destination)}
    />
  );
}

// A page's own pages keep its row selected.
const childPages: Partial<
  Record<NavigationDestination['to'], NavigationDestination['to'][]>
> = {
  'settings-projects': ['settings-project'],
  'settings-agents': ['settings-agent', 'settings-agent-new'],
};

function selectedRow(
  destination: NavigationDestination,
  selected?: NavigationDestination,
): boolean {
  if (selected === undefined) return false;
  const pages = [destination.to, ...(childPages[destination.to] ?? [])];

  return pages.includes(selected.to);
}
