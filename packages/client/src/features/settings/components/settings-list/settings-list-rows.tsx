import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SettingsListProps, SettingsRow } from './settings-list-props';

type Selection = Pick<SettingsListProps, 'selectedPath' | 'onSelect'>;

// One row each, straight in the section: Android's Section gives each child it finds its own Material row.
export function SettingsRowItem({
  row,
  selectedPath,
  onSelect,
}: Selection & { row: SettingsRow }): React.JSX.Element {
  const wide = useWide();

  return (
    <GroupedListItem
      {...row}
      selected={wide && selectedRow(row.href, selectedPath)}
      onPress={() => onSelect(row.href)}
    />
  );
}

// A page's own pages keep its row selected.
function selectedRow(href: string, selected?: string): boolean {
  if (selected === undefined) return false;

  return selected === href || selected.startsWith(`${href}/`);
}
