import type {
  SettingsGroup,
  SettingsListViewProps,
  SettingsRow,
} from './settings-list-props';
import {
  accountsRow,
  agentAccessRow,
  agentsRow,
  connectionRow,
  devicesRow,
  pluginsRow,
  projectsRow,
} from './settings-list-server-rows';

const wideOnly = (wide: boolean, row: SettingsRow): SettingsRow[] =>
  wide ? [row] : [];

const notificationsRow = (props: SettingsListViewProps): SettingsRow => ({
  label: 'Notifications',
  icon: 'notifications',
  href: '/settings/notifications',
  value: props.notificationsState ?? 'On',
});

const connectionRows = (
  props: SettingsListViewProps,
  wide: boolean,
): SettingsRow[] => [
  connectionRow(props, wide),
  ...wideOnly(wide, devicesRow(props)),
  ...wideOnly(wide, notificationsRow(props)),
];

// Paper's SettingsList: the pages in three groups; a phone leaves out Devices and Notifications.
function pageGroups(
  props: SettingsListViewProps,
  wide: boolean,
): SettingsGroup[] {
  return [
    {
      title: 'Workspace',
      rows: [
        projectsRow(props),
        agentsRow(props),
        agentAccessRow(props),
        pluginsRow(props),
      ],
    },
    { title: 'Account', rows: [accountsRow(props)] },
    { title: 'Connection', rows: connectionRows(props, wide) },
  ];
}

// Whether a label holds the search, ignoring case.
export function matchesSearch(label: string, query = ''): boolean {
  return label.toLowerCase().includes(query.trim().toLowerCase());
}

// The groups narrowed to the rows the search matches; a group left with none goes.
export function settingsGroups(
  props: SettingsListViewProps,
  wide: boolean,
): SettingsGroup[] {
  return pageGroups(props, wide)
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => matchesSearch(row.label, props.query)),
    }))
    .filter((group) => group.rows.length > 0);
}

export const settingsRows = (
  props: SettingsListViewProps,
  wide: boolean,
): SettingsRow[] => settingsGroups(props, wide).flatMap((group) => group.rows);
