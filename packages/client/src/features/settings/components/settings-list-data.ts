import type { NavigationDestination } from '#lib/product/navigation/context';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import { connectionValue, serverValue } from './settings-list-labels';
import type { SettingsListProps } from './settings-list-props';

export interface SettingsRow {
  title: string;
  icon: IconName;
  destination: NavigationDestination;
  value?: string;
  needsAttention?: boolean;
  disabled?: boolean;
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

function serverDestinations(props: SettingsListProps): SettingsRow[] {
  const disabled = serverDisabled(props);
  return [
    {
      title: 'Projects',
      icon: 'folder',
      destination: { to: 'settings-projects' },
      value: serverValue(props, String(props.projects.length)),
      needsAttention: props.projectsNeedAttention,
      disabled,
    },
    {
      title: 'Agents',
      icon: 'agent',
      destination: { to: 'settings-agents' },
      value: serverValue(props, String(props.agents.length)),
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
