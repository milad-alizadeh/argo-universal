import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { SettingsListProps, SettingsRow } from './settings-list-props';

type Selection = Pick<SettingsListProps, 'selectedPath' | 'onSelect'>;

// One row each, straight in the section; only the sidebar shows the page that is open: Android's Section gives each child it finds its own Material row.
export function SettingsRowItem({
  row,
  selectable,
  selectedPath,
  onSelect,
}: Selection & { row: SettingsRow; selectable: boolean }): React.JSX.Element {
  return (
    <GroupedListItem
      {...row}
      selected={selectable && selectedRow(row.href, selectedPath)}
      onPress={() => onSelect(row.href)}
    />
  );
}

// A page's own pages keep its row selected.
function selectedRow(href: string, selected?: string): boolean {
  if (selected === undefined) return false;

  return selected === href || selected.startsWith(`${href}/`);
}
