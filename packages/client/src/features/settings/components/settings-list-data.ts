import type { NavigationDestination } from '#lib/product/navigation/context';
import type { ListItemProps } from '../../../lib/generic/primitives/field-props';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import {
  connectionValue,
  countValue,
  serverValue,
} from './settings-list-labels';
import type { SettingsListProps } from './settings-list-props';

export interface SettingsRow {
  title: string;
  icon: IconName;
  destination: NavigationDestination;
  value?: string;
  needsAttention?: boolean;
  disabled?: boolean;
  status?: ListItemProps['status'];
}

export function serverRows(
  props: SettingsListProps,
  wide: boolean,
): SettingsRow[] {
  return [
    ...serverDestinations(props),
    {
      title: 'Connection',
      icon: 'server',
      destination: { to: 'settings-connection' },
      value: connectionValue(props, wide),
      status: connectionStatus(props.status),
    },
    ...(wide
      ? [
          {
            title: 'Devices',
            icon: 'phone',
            destination: { to: 'settings-devices' },
            value: serverValue(props, props.deviceCount?.toString()),
            disabled: serverDisabled(props),
          } satisfies SettingsRow,
        ]
      : []),
  ];
}

function connectionStatus(
  status: SettingsListProps['status'],
): ListItemProps['status'] {
  if (status === 'disconnected')
    return { tone: 'destructive', label: 'server unavailable' };
  if (status === 'loading') return { tone: 'warning', label: 'connecting' };
  return { tone: 'success', label: 'available' };
}

function serverDestinations(props: SettingsListProps): SettingsRow[] {
  const disabled = serverDisabled(props);
  return [
    {
      title: 'Projects',
      icon: 'folder',
      destination: { to: 'settings-projects' },
      value: countValue(props, props.projects),
      needsAttention: props.projectsNeedAttention,
      disabled,
    },
    {
      title: 'Agents',
      icon: 'agent',
      destination: { to: 'settings-agents' },
      value: countValue(props, props.agents),
      needsAttention: props.agentsNeedAttention,
      disabled,
    },
    {
      title: 'Accounts',
      icon: 'key',
      destination: { to: 'settings-accounts' },
      value: serverValue(props, props.accountState),
      disabled,
    },
  ];
}

function serverDisabled(props: SettingsListProps): boolean {
  return props.status !== undefined && props.status !== 'ready';
}

export function deviceRows(
  props: SettingsListProps,
  wide: boolean,
): SettingsRow[] {
  return [
    {
      title: 'Appearance',
      icon: 'appearance',
      destination: { to: 'settings-appearance' },
      value: props.appearanceState ?? 'System',
    },
    ...(wide
      ? [
          {
            title: 'Notifications',
            icon: 'notifications',
            destination: { to: 'settings-notifications' },
            value: props.notificationsState ?? 'On',
          } satisfies SettingsRow,
        ]
      : []),
  ];
}

// The rows whose title holds the search, ignoring case.
export function matchingRows(
  rows: readonly SettingsRow[],
  query = '',
): SettingsRow[] {
  const search = query.trim().toLowerCase();
  return rows.filter(({ title }) => title.toLowerCase().includes(search));
}
