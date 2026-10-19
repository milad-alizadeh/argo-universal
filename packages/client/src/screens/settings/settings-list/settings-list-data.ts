import type { SettingsListViewProps, SettingsRow } from './settings-list-props';
import {
  accountsRow,
  agentsRow,
  connectionRow,
  devicesRow,
  pluginsRow,
  projectsRow,
} from './settings-list-server-rows';

const wideOnly = (wide: boolean, row: SettingsRow): SettingsRow[] =>
  wide ? [row] : [];

function serverRows(
  props: SettingsListViewProps,
  wide: boolean,
): SettingsRow[] {
  return [
    projectsRow(props),
    agentsRow(props),
    pluginsRow(props),
    accountsRow(props),
    connectionRow(props, wide),
    ...wideOnly(wide, devicesRow(props)),
  ];
}

function deviceRows(
  props: SettingsListViewProps,
  wide: boolean,
): SettingsRow[] {
  return [appearanceRow(props), ...wideOnly(wide, notificationsRow(props))];
}

const appearanceRow = (props: SettingsListViewProps): SettingsRow => ({
  label: 'Appearance',
  icon: 'appearance',
  href: '/settings/appearance',
  value: props.appearanceState ?? 'System',
});

const notificationsRow = (props: SettingsListViewProps): SettingsRow => ({
  label: 'Notifications',
  icon: 'notifications',
  href: '/settings/notifications',
  value: props.notificationsState ?? 'On',
});

// The rows whose label holds the search, ignoring case.
function matchingRows(rows: readonly SettingsRow[], query = ''): SettingsRow[] {
  const search = query.trim().toLowerCase();

  return rows.filter(({ label }) => label.toLowerCase().includes(search));
}

export function settingsRows(
  props: SettingsListViewProps,
  wide: boolean,
): SettingsRow[] {
  return matchingRows(
    [...serverRows(props, wide), ...deviceRows(props, wide)],
    props.query,
  );
}
