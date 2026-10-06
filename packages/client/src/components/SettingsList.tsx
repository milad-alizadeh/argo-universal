import {
  BellIcon,
  CircleHalfIcon,
  DeviceMobileIcon,
  FolderIcon,
  HardDrivesIcon,
  KeyIcon,
  type Icon as PhosphorIcon,
  RobotIcon,
} from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import type { Navigate, NavigationDestination } from '../navigation/context';
import { useWide } from '../navigation/use-wide';
import { Icon } from './Icon';

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
}: SettingsListProps) {
  const wide = useWide();
  const device =
    deviceName ??
    (wide
      ? 'This Mac'
      : Platform.OS === 'android'
        ? 'This device'
        : 'This iPhone');

  function row(
    label: string,
    icon: PhosphorIcon,
    destination: NavigationDestination,
    state?: string,
    attention = false,
  ) {
    const selected =
      wide &&
      (destination.to === selectedDestination?.to ||
        (destination.to === 'settings-projects' &&
          selectedDestination?.to === 'settings-project') ||
        (destination.to === 'settings-agents' &&
          selectedDestination?.to === 'settings-agent'));
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
        <View className="size-4.5 shrink-0 items-center justify-center wide:size-4">
          <Icon
            as={icon}
            className={cn(
              'size-4.5 text-muted-foreground wide:size-4',
              selected && 'text-foreground',
            )}
          />
        </View>
        <Text
          className="min-w-0 flex-1 text-base leading-6 font-normal wide:text-sm wide:leading-5"
          numberOfLines={1}
        >
          {label}
        </Text>
        {attention ? (
          <View
            className="size-2 shrink-0 rounded-full bg-warning"
            testID={`settings-${label.toLowerCase()}-attention`}
            accessibilityLabel={`${label} needs attention`}
          />
        ) : state !== undefined ? (
          <Text
            className="shrink-0 text-sm leading-5 text-muted-foreground wide:text-xs wide:leading-4"
            numberOfLines={1}
          >
            {state}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <ScrollView
      className="flex-1 web:select-none web:[&_*]:select-none!"
      contentContainerClassName="px-screen-list pt-2 pb-4 wide:px-2 wide:pt-0 wide:pb-3"
    >
      <Group title={serverName ? `Server · ${serverName}` : 'Server'}>
        {row(
          'Projects',
          FolderIcon,
          { to: 'settings-projects' },
          String(projects.length),
          projectsNeedAttention,
        )}
        {row(
          'Agents',
          RobotIcon,
          { to: 'settings-agents' },
          String(agents.length),
          agentsNeedAttention,
        )}
        {row('Accounts', KeyIcon, { to: 'settings-accounts' }, accountState)}
        {row(
          'Connection',
          HardDrivesIcon,
          { to: 'settings-connection' },
          connectionState ?? (wide ? 'This Mac' : 'Direct'),
        )}
        {wide &&
          row(
            'Devices',
            DeviceMobileIcon,
            { to: 'settings-devices' },
            deviceCount === undefined ? undefined : String(deviceCount),
          )}
      </Group>
      <View className="pt-3">
        <Group title={device}>
          {row(
            'Appearance',
            CircleHalfIcon,
            { to: 'settings-appearance' },
            appearanceState,
          )}
          {wide &&
            row(
              'Notifications',
              BellIcon,
              { to: 'settings-notifications' },
              notificationsState,
            )}
        </Group>
      </View>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
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
