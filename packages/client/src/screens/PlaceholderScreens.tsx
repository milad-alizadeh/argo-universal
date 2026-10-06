import { View } from 'react-native';
import { Text } from '#primitives/text';

export function IssuesScreen() {
  return <Placeholder title="Issues" description="Issues will appear here." />;
}

export function AtlasScreen() {
  return <Placeholder title="Atlas" description="Atlas will appear here." />;
}

export function AccountsScreen() {
  return (
    <Placeholder title="Accounts" description="Accounts will appear here." />
  );
}

export function ProjectsSettingsScreen() {
  return (
    <Placeholder title="Projects" description="Projects will appear here." />
  );
}

export function AgentsSettingsScreen() {
  return <Placeholder title="Agents" description="Agents will appear here." />;
}

export function DevicesScreen() {
  return (
    <Placeholder title="Devices" description="Devices will appear here." />
  );
}

export function AppearanceScreen() {
  return (
    <Placeholder
      title="Appearance"
      description="Appearance will appear here."
    />
  );
}

export function NotificationsScreen() {
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

export function ProjectSettingsScreen({ name }: ProjectSettingsScreenProps) {
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

export function AgentSettingsScreen({ agent }: AgentSettingsScreenProps) {
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
}) {
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
