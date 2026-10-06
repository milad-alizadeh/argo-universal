import { ProjectSettingsScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';

export default function ProjectSettingsRoute() {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ProjectSettingsScreen name={name} />;
}
