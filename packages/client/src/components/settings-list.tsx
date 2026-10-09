import type * as React from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import type { IconName } from '#lib/icon-names';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import type { Navigate, NavigationDestination } from '../navigation/context';
import { useWide } from '../navigation/use-wide';

export interface SettingsListProps {
  projects: readonly { name: string }[];
  agents: readonly { agent: string; label: string }[];
  selectedDestination?: NavigationDestination;
  onSelect: Navigate;
  serverName?: string;
  deviceName?: string;
  projectsNeedAttention?: boolean;
  agentsNeedAttention?: boolean;
  accountState?: string;
  connectionState?: string;
  deviceCount?: number;
  appearanceState?: string;
  notificationsState?: string;
}

export function SettingsList({
  projects,
  agents,
  selectedDestination,
  onSelect,
  serverName,
  deviceName,
  projectsNeedAttention = false,
  agentsNeedAttention = false,
  accountState,
  connectionState,
  deviceCount,
  appearanceState = 'System',
  notificationsState = 'On',
}: SettingsListProps): React.JSX.Element {
  const wide = useWide();
  let device = deviceName;
  if (device === undefined || device === null) {
    if (wide) device = 'This Mac';
    else if (Platform.OS === 'android') device = 'This device';
    else device = 'This iPhone';
  }

  function row({
    label,
    icon,
    destination,
    state,
    attention = false,
  }: {
    label: string;
    icon: IconName;
    destination: NavigationDestination;
    state?: string;
    attention?: boolean;
  }): React.JSX.Element {
    const selected =
      wide &&
      (destination.to === selectedDestination?.to ||
        (destination.to === 'settings-projects' &&
          selectedDestination?.to === 'settings-project') ||
        (destination.to === 'settings-agents' &&
          selectedDestination?.to === 'settings-agent'));
    let rowStatus: ReactNode = null;
    if (attention) {
      rowStatus = (
        <View
          className="size-1.5 shrink-0 rounded-full bg-warning"
          testID={`settings-${label.toLowerCase()}-attention`}
          accessibilityLabel={`${label} needs attention`}
        />
      );
    } else if (state !== undefined) {
      rowStatus = (
        <Text className="shrink-0 type-secondary" numberOfLines={1}>
          {state}
        </Text>
      );
    }
    return (
      <Pressable
        role="button"
        className={cn(
          'h-11 shrink-0 flex-row items-center gap-2 rounded-md pl-2.5 pr-3 wide:h-8 wide:pl-2.5 wide:pr-2 active:bg-sidebar-accent web:hover:bg-sidebar-accent web:focus-visible:bg-sidebar-accent',
          selected && 'bg-sidebar-accent',
        )}
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        aria-selected={selected}
        onPress={() => onSelect(destination)}
      >
        <Icon
          name={icon}
          className={cn(
            'shrink-0 text-muted-foreground',
            selected && 'text-foreground',
          )}
        />
        <Text className="min-w-0 flex-1 type-body" numberOfLines={1}>
          {label}
        </Text>
        {rowStatus}
      </Pressable>
    );
  }

  return (
    <ScrollView
      className="flex-1 web:select-none web:[&_*]:select-none!"
      contentContainerClassName="px-gutter-list pt-2 pb-4 wide:px-2 wide:pt-0 wide:pb-3"
    >
      <Group title={serverName ? `Server · ${serverName}` : 'Server'}>
        {row({
          label: 'Projects',
          icon: 'folder',
          destination: { to: 'settings-projects' },
          state: String(projects.length),
          attention: projectsNeedAttention,
        })}
        {row({
          label: 'Agents',
          icon: 'agent',
          destination: { to: 'settings-agents' },
          state: String(agents.length),
          attention: agentsNeedAttention,
        })}
        {row({
          label: 'Accounts',
          icon: 'key',
          destination: { to: 'settings-accounts' },
          state: accountState,
        })}
        {row({
          label: 'Connection',
          icon: 'server',
          destination: { to: 'settings-connection' },
          state: connectionState ?? (wide ? 'This Mac' : 'Direct'),
        })}
        {wide &&
          row({
            label: 'Devices',
            icon: 'phone',
            destination: { to: 'settings-devices' },
            state: deviceCount === undefined ? undefined : String(deviceCount),
          })}
      </Group>
      <View className="pt-3">
        <Group title={device}>
          {row({
            label: 'Appearance',
            icon: 'appearance',
            destination: { to: 'settings-appearance' },
            state: appearanceState,
          })}
          {wide &&
            row({
              label: 'Notifications',
              icon: 'notifications',
              destination: { to: 'settings-notifications' },
              state: notificationsState,
            })}
        </Group>
      </View>
    </ScrollView>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <View className="wide:gap-0.5">
      <View className="h-9 shrink-0 justify-center pl-2.5 wide:h-8 wide:pr-1">
        <Text
          role="heading"
          aria-level={2}
          className="text-sm leading-5 font-medium text-muted-foreground wide:text-xs wide:leading-4"
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
