import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';

export function IssuesScreen(): React.JSX.Element {
  return <Placeholder title="Issues" description="Issues will appear here." />;
}

export function AtlasScreen(): React.JSX.Element {
  return <Placeholder title="Atlas" description="Atlas will appear here." />;
}

export function AccountsScreen(): React.JSX.Element {
  return (
    <Placeholder title="Accounts" description="Accounts will appear here." />
  );
}

export function ProjectsSettingsScreen(): React.JSX.Element {
  return (
    <Placeholder title="Projects" description="Projects will appear here." />
  );
}

export function DevicesScreen(): React.JSX.Element {
  return (
    <Placeholder title="Devices" description="Devices will appear here." />
  );
}

export function AppearanceScreen(): React.JSX.Element {
  return (
    <Placeholder
      title="Appearance"
      description="Appearance will appear here."
    />
  );
}

export function NotificationsScreen(): React.JSX.Element {
  return (
    <Placeholder
      title="Notifications"
      description="Notifications will appear here."
    />
  );
}

export interface ProjectSettingsScreenProps {
  name: string;
}

export function ProjectSettingsScreen({
  name,
}: ProjectSettingsScreenProps): React.JSX.Element {
  return (
    <Placeholder
      title="Project settings"
      description={`Settings for ${name} will appear here.`}
    />
  );
}

export interface AgentSettingsScreenProps {
  agent: string;
}

export function AgentSettingsScreen({
  agent,
}: AgentSettingsScreenProps): React.JSX.Element {
  return (
    <Placeholder
      title="Agent"
      description={`Settings for ${agent} will appear here.`}
    />
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-gutter py-6">
      <Text role="heading" aria-level={1} variant="h3">
        {title}
      </Text>
      <Text variant="muted" className="text-center">
        {description}
      </Text>
    </View>
  );
}
