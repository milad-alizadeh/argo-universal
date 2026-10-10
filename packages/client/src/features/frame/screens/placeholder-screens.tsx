import type * as React from 'react';
import { Placeholder } from '#lib/product/placeholder';

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
