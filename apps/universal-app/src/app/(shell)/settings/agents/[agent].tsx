import { AgentDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function AgentDetailRoute(): React.JSX.Element {
  const { agent } = useLocalSearchParams<{ agent: string }>();
  return <AgentDetailScreen agent={agent} />;
}
