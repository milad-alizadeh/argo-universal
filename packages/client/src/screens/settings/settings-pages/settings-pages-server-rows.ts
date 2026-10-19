import type { RowBadge } from '#primitives/lists/list-item';
import {
  connectionValue,
  countValue,
  serverValue,
} from './settings-pages-labels';
import type { SettingsPagesProps, SettingsRow } from './settings-pages-props';

type CountedPage = Omit<SettingsRow, 'value' | 'disabled'> & {
  count?: number;
};

function serverDisabled(props: SettingsPagesProps): boolean {
  return props.status !== undefined && props.status !== 'ready';
}

function countedRow(
  props: SettingsPagesProps,
  { count, ...page }: CountedPage,
): SettingsRow {
  return {
    ...page,
    value: countValue(props, count),
    disabled: serverDisabled(props),
  };
}

export function projectsRow(props: SettingsPagesProps): SettingsRow {
  return countedRow(props, {
    label: 'Projects',
    icon: 'folder',
    href: '/settings/projects',
    count: props.projectCount,
    needsAttention: props.projectsNeedAttention,
  });
}

export function agentsRow(props: SettingsPagesProps): SettingsRow {
  return countedRow(props, {
    label: 'Agents',
    icon: 'agent',
    href: '/settings/agents',
    count: props.agentCount,
  });
}

export function pluginsRow(props: SettingsPagesProps): SettingsRow {
  return countedRow(props, {
    label: 'Plugins',
    icon: 'plug',
    href: '/settings/plugins',
    count: props.pluginCount,
  });
}

export function accountsRow(props: SettingsPagesProps): SettingsRow {
  return {
    label: 'Accounts',
    icon: 'key',
    href: '/settings/accounts',
    value: serverValue(props, props.accountState),
    disabled: serverDisabled(props),
  };
}

const connectionStatuses: Record<
  NonNullable<SettingsPagesProps['status']>,
  Omit<Extract<RowBadge, { kind: 'status' }>, 'kind'>
> = {
  disconnected: { tone: 'danger', label: 'server unavailable' },
  loading: { tone: 'warning', label: 'connecting' },
  ready: { tone: 'success', label: 'available' },
};

export function connectionRow(
  props: SettingsPagesProps,
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

export function devicesRow(props: SettingsPagesProps): SettingsRow {
  return {
    label: 'Devices',
    icon: 'phone',
    href: '/settings/devices',
    value: serverValue(props, props.deviceCount?.toString()),
    disabled: serverDisabled(props),
  };
}
