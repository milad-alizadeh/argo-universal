import type { SettingsPagesProps, SettingsRow } from './settings-pages-props';
import {
  accountsRow,
  agentsRow,
  connectionRow,
  devicesRow,
  pluginsRow,
  projectsRow,
} from './settings-pages-server-rows';

const wideOnly = (wide: boolean, row: SettingsRow): SettingsRow[] =>
  wide ? [row] : [];

function serverRows(props: SettingsPagesProps, wide: boolean): SettingsRow[] {
  return [
    projectsRow(props),
    agentsRow(props),
    pluginsRow(props),
    accountsRow(props),
    connectionRow(props, wide),
    ...wideOnly(wide, devicesRow(props)),
  ];
}

function deviceRows(props: SettingsPagesProps, wide: boolean): SettingsRow[] {
  return [appearanceRow(props), ...wideOnly(wide, notificationsRow(props))];
}

const appearanceRow = (props: SettingsPagesProps): SettingsRow => ({
  label: 'Appearance',
  icon: 'appearance',
  href: '/settings/appearance',
  value: props.appearanceState ?? 'System',
});

const notificationsRow = (props: SettingsPagesProps): SettingsRow => ({
  label: 'Notifications',
  icon: 'notifications',
  href: '/settings/notifications',
  value: props.notificationsState ?? 'On',
});

// The rows whose label holds the search, ignoring case.
function matchingRows(
  rows: readonly SettingsRow[],
  query = '',
): SettingsRow[] {
  const search = query.trim().toLowerCase();

  return rows.filter(({ label }) => label.toLowerCase().includes(search));
}

export function settingsRows(
  props: SettingsPagesProps,
  wide: boolean,
): SettingsRow[] {
  return matchingRows(
    [...serverRows(props, wide), ...deviceRows(props, wide)],
    props.query,
  );
}
