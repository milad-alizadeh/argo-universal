import { AgentSettingsScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';

export default function AgentSettingsRoute() {
  const { agent } = useLocalSearchParams<{ agent: string }>();
  return <AgentSettingsScreen agent={agent} />;
}
