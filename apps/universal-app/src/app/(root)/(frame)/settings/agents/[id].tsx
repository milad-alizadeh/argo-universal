import { AgentDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function AgentRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AgentDetailScreen agentId={id} />;
}
