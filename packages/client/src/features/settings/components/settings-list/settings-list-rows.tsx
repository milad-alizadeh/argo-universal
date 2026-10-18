import type { ReactElement } from 'react';
import { Icon } from '#primitives/content/icon';
import { ListItem, type ListItemProps } from '#primitives/lists/list-item';
import type { SettingsListProps, SettingsRow } from './settings-list-props';

type Selection = Pick<SettingsListProps, 'selectedPath' | 'onSelect'>;

export function SettingsRowItem({
  row,
  selectable,
  selectedPath,
  onSelect,
}: Selection & { row: SettingsRow; selectable: boolean }): ReactElement {
  return (
    <ListItem.Link
      {...rowContent(row)}
      selected={selectable && selectedRow(row.href, selectedPath)}
      onPress={() => onSelect(row.href)}
    />
  );
}

function rowContent(row: SettingsRow): ListItemProps {
  return {
    title: row.label,
    href: row.href,
    value: row.value,
    disabled: row.disabled,
    accessibilityLabel: rowName(row),
    leading: <Icon name={row.icon} role="row" />,
    badge: rowBadge(row),
  };
}

function rowName(row: SettingsRow): string {
  const status = distinctStatus(row);

  return [
    row.label,
    row.value,
    status,
    row.needsAttention ? 'needs attention' : undefined,
  ]
    .filter(Boolean)
    .join(', ');
}

function rowBadge(row: SettingsRow): ListItemProps['badge'] {
  if (row.status) return { kind: 'status', ...row.status };

  return row.needsAttention
    ? { kind: 'status', tone: 'warning', label: 'needs attention' }
    : undefined;
}

function selectedRow(href: string, selected?: string): boolean {
  if (selected === undefined) return false;

  return selected === href || selected.startsWith(`${href}/`);
}

function distinctStatus(row: SettingsRow): string | undefined {
  const status = row.status?.label;

  return status === row.value ? undefined : status;
}
