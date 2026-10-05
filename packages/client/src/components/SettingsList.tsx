import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import type { Navigate, NavigationDestination } from '../navigation/context';

export interface SettingsListProps {
  projects: readonly { name: string }[];
  agents: readonly { agent: string; label: string }[];
  selectedDestination?: NavigationDestination;
  onSelect: Navigate;
}

export function SettingsList({
  projects,
  agents,
  selectedDestination,
  onSelect,
}: SettingsListProps) {
  function row(label: string, destination?: NavigationDestination) {
    const selected =
      destination !== undefined &&
      selectedDestination !== undefined &&
      destination.to === selectedDestination.to &&
      (destination.to !== 'settings-project' ||
        (selectedDestination.to === 'settings-project' &&
          destination.name === selectedDestination.name)) &&
      (destination.to !== 'settings-agent' ||
        (selectedDestination.to === 'settings-agent' &&
          destination.agent === selectedDestination.agent));
    return (
      <Button
        key={destination?.to === 'settings-agent' ? destination.agent : label}
        variant="ghost"
        className={cn(
          'h-11 sm:h-11 justify-start px-3',
          selected && 'bg-accent',
        )}
        accessibilityLabel={label}
        accessibilityState={{ selected, disabled: !destination }}
        aria-selected={selected}
        disabled={!destination}
        onPress={() => destination && onSelect(destination)}
      >
        <Text
          className={cn('text-sm', selected && 'text-accent-foreground')}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Button>
    );
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6 px-3 py-4">
      <Group title="Projects">
        {projects.length ? (
          projects.map(({ name }) =>
            row(name, { to: 'settings-project', name }),
          )
        ) : (
          <Text variant="muted" className="px-3 text-sm">
            Projects will appear here.
          </Text>
        )}
      </Group>
      <Group title="Server">
        {row('Accounts', { to: 'settings-accounts' })}
        {row('Connection', { to: 'settings-connection' })}
      </Group>
      <Group title="Agents">
        {agents.length ? (
          agents.map(({ agent, label }) =>
            row(label, { to: 'settings-agent', agent }),
          )
        ) : (
          <Text variant="muted" className="px-3 text-sm">
            Registered Agents will appear here.
          </Text>
        )}
      </Group>
      <Group title="App">
        {row('Appearance')}
        {row('Notifications')}
      </Group>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text
        role="heading"
        aria-level={2}
        className="px-3 text-xs font-semibold text-muted-foreground"
      >
        {title}
      </Text>
      {children}
    </View>
  );
}
