import { ProjectSettingsScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function ProjectSettingsRoute(): React.JSX.Element {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ProjectSettingsScreen name={name} />;
}
