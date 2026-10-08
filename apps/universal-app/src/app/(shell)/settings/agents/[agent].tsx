import { AgentSettingsScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function AgentSettingsRoute(): React.JSX.Element {
  const { agent } = useLocalSearchParams<{ agent: string }>();
  return <AgentSettingsScreen agent={agent} />;
}
