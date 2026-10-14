import type { ListItemProps } from '#primitives/lists/list-item';
import {
  connectionValue,
  countValue,
  serverValue,
} from './settings-list-labels';
import type { SettingsListProps, SettingsRow } from './settings-list-props';

type CountedPage = Omit<SettingsRow, 'value' | 'disabled'> & {
  count?: number;
};

export function serverDisabled(props: SettingsListProps): boolean {
  return props.status !== undefined && props.status !== 'ready';
}

function countedRow(
  props: SettingsListProps,
  { count, ...page }: CountedPage,
): SettingsRow {
  return {
    ...page,
    value: countValue(props, count),
    disabled: serverDisabled(props),
  };
}

export function projectsRow(props: SettingsListProps): SettingsRow {
  return countedRow(props, {
    title: 'Projects',
    icon: 'folder',
    destination: { to: 'settings-projects' },
    count: props.projectCount,
    needsAttention: props.projectsNeedAttention,
  });
}

export function agentsRow(props: SettingsListProps): SettingsRow {
  return countedRow(props, {
    title: 'Agents',
    icon: 'agent',
    destination: { to: 'settings-agents' },
    count: props.agentCount,
    needsAttention: props.agentsNeedAttention,
  });
}

export function accountsRow(props: SettingsListProps): SettingsRow {
  return {
    title: 'Accounts',
    icon: 'key',
    destination: { to: 'settings-accounts' },
    value: serverValue(props, props.accountState),
    disabled: serverDisabled(props),
  };
}

const connectionStatuses: Record<
  NonNullable<SettingsListProps['status']>,
  ListItemProps['status']
> = {
  disconnected: { tone: 'destructive', label: 'server unavailable' },
  loading: { tone: 'warning', label: 'connecting' },
  ready: { tone: 'success', label: 'available' },
};

export function connectionRow(
  props: SettingsListProps,
  wide: boolean,
): SettingsRow {
  return {
    title: 'Connection',
    icon: 'server',
    destination: { to: 'settings-connection' },
    value: connectionValue(props, wide),
    status: connectionStatuses[props.status ?? 'ready'],
  };
}

export function devicesRow(props: SettingsListProps): SettingsRow {
  return {
    title: 'Devices',
    icon: 'phone',
    destination: { to: 'settings-devices' },
    value: serverValue(props, props.deviceCount?.toString()),
    disabled: serverDisabled(props),
  };
}
