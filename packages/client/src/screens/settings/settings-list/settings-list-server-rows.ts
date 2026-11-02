import type { RowBadge } from '@repo/kit/primitives/lists/list-item';
import { ownServerName } from '#lib/product/server-scope';
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

// A down Connection's status says what the row's value does: a phone's row joins only a distinct status to its value, so it stays one line.
const connectionStatuses: Record<
  NonNullable<SettingsListViewProps['status']>,
  Omit<Extract<RowBadge, { kind: 'status' }>, 'kind'>
> = {
  disconnected: { tone: 'danger', label: 'Disconnected' },
  loading: { tone: 'warning', label: 'Connecting…' },
  ready: { tone: 'success', label: 'available' },
};

// Every Server this App holds a Connection to. One Server is the ordinary case, so the row reads the same with one.
export function serversRow(props: SettingsListViewProps): SettingsRow {
  return {
    label: 'Servers',
    icon: 'server',
    href: '/settings/servers',
    value: props.serverName ?? ownServerName,
  };
}

export function connectionRow(props: SettingsListViewProps): SettingsRow {
  return {
    label: 'Connection',
    icon: 'connection',
    href: '/settings/connection',
    value: connectionValue(props),
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

export function agentAccessRow(props: SettingsListViewProps): SettingsRow {
  return {
    label: 'Agent access',
    icon: 'agent',
    href: '/settings/agent-access',
    disabled: serverDisabled(props),
  };
}
