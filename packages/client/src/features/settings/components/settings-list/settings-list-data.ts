import type { SettingsListProps, SettingsRow } from './settings-list-props';
import {
  accountsRow,
  agentsRow,
  connectionRow,
  devicesRow,
  projectsRow,
} from './settings-list-server-rows';

const wideOnly = (wide: boolean, row: SettingsRow): SettingsRow[] =>
  wide ? [row] : [];

function serverRows(props: SettingsListProps, wide: boolean): SettingsRow[] {
  return [
    projectsRow(props),
    agentsRow(props),
    accountsRow(props),
    connectionRow(props, wide),
    ...wideOnly(wide, devicesRow(props)),
  ];
}

function deviceRows(props: SettingsListProps, wide: boolean): SettingsRow[] {
  return [appearanceRow(props), ...wideOnly(wide, notificationsRow(props))];
}

const appearanceRow = (props: SettingsListProps): SettingsRow => ({
  label: 'Appearance',
  icon: 'appearance',
  destination: { to: 'settings-appearance' },
  value: props.appearanceState ?? 'System',
});

const notificationsRow = (props: SettingsListProps): SettingsRow => ({
  label: 'Notifications',
  icon: 'notifications',
  destination: { to: 'settings-notifications' },
  value: props.notificationsState ?? 'On',
});

// The rows whose label holds the search, ignoring case.
export function matchingRows(
  rows: readonly SettingsRow[],
  query = '',
): SettingsRow[] {
  const search = query.trim().toLowerCase();

  return rows.filter(({ label }) => label.toLowerCase().includes(search));
}

export function settingsRows(
  props: SettingsListProps,
  wide: boolean,
): SettingsRow[] {
  return matchingRows(
    [...serverRows(props, wide), ...deviceRows(props, wide)],
    props.query,
  );
}
