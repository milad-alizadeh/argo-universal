import type { RowBadge } from '@repo/kit/primitives/lists/list-item';
import {
  connectionValue,
  countValue,
  serverValue,
} from './settings-list-labels';
import type { SettingsListViewProps, SettingsRow } from './settings-list-props';

type CountedPage = Omit<SettingsRow, 'value' | 'disabled'> & {
  count?: number;
};

function serverDisabled(props: SettingsListViewProps): boolean {
  return props.status !== undefined && props.status !== 'ready';
}

function countedRow(
  props: SettingsListViewProps,
  { count, ...page }: CountedPage,
): SettingsRow {
  return {
    ...page,
    value: countValue(props, count),
    disabled: serverDisabled(props),
  };
}

export function projectsRow(props: SettingsListViewProps): SettingsRow {
  return countedRow(props, {
    label: 'Projects',
    icon: 'folder',
    href: '/settings/projects',
    count: props.projectCount,
    needsAttention: props.projectsNeedAttention,
  });
}

export function agentsRow(props: SettingsListViewProps): SettingsRow {
  return countedRow(props, {
    label: 'Agents',
    icon: 'agent',
    href: '/settings/agents',
    count: props.agentCount,
  });
}

export function pluginsRow(props: SettingsListViewProps): SettingsRow {
  return countedRow(props, {
    label: 'Plugins',
    icon: 'plugins',
    href: '/settings/plugins',
    count: props.pluginCount,
  });
}

export function accountsRow(props: SettingsListViewProps): SettingsRow {
  return {
    label: 'Accounts',
    icon: 'key',
    href: '/settings/accounts',
    value: serverValue(props, props.accountState),
    disabled: serverDisabled(props),
  };
}

const connectionStatuses: Record<
  NonNullable<SettingsListViewProps['status']>,
  Omit<Extract<RowBadge, { kind: 'status' }>, 'kind'>
> = {
  disconnected: { tone: 'danger', label: 'server unavailable' },
  loading: { tone: 'warning', label: 'connecting' },
  ready: { tone: 'success', label: 'available' },
};

export function connectionRow(
  props: SettingsListViewProps,
  wide: boolean,
): SettingsRow {
  return {
    label: 'Connection',
    icon: 'server',
    href: '/settings/connection',
    value: connectionValue(props, wide),
    status: connectionStatuses[props.status ?? 'ready'],
  };
}

export function devicesRow(props: SettingsListViewProps): SettingsRow {
  return {
    label: 'Devices',
    icon: 'phone',
    href: '/settings/devices',
    value: serverValue(props, props.deviceCount?.toString()),
    disabled: serverDisabled(props),
  };
}
