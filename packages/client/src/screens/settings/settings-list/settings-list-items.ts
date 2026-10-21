import type { SettingsLayoutItem } from '@repo/kit/primitives/scaffolds/settings-layout';
import type { SettingsRow } from './settings-list-props';

// A page's row: its link, its value, and a status or attention badge, all in its spoken name.
export function settingsItem(row: SettingsRow): SettingsLayoutItem {
  return {
    id: row.href,
    title: row.label,
    icon: row.icon,
    href: row.href,
    value: row.value,
    disabled: row.disabled,
    accessibilityLabel: rowName(row),
    badge: rowBadge(row),
  };
}

// The row of the page a path shows; a page's own pages keep its row.
export function shownRow(
  rows: readonly SettingsRow[],
  path = '',
): SettingsRow | undefined {
  return rows.find(({ href }) => path === href || path.startsWith(`${href}/`));
}

function rowName(row: SettingsRow): string {
  return [
    row.label,
    row.value,
    distinctStatus(row),
    row.needsAttention ? 'needs attention' : undefined,
  ]
    .filter(Boolean)
    .join(', ');
}

function rowBadge(row: SettingsRow): SettingsLayoutItem['badge'] {
  if (row.status) return { kind: 'status', ...row.status };

  return row.needsAttention
    ? { kind: 'status', tone: 'warning', label: 'needs attention' }
    : undefined;
}

function distinctStatus(row: SettingsRow): string | undefined {
  const status = row.status?.label;

  return status === row.value ? undefined : status;
}
