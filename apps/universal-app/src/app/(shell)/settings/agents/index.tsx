import { AgentListScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function AgentsRoute(): React.JSX.Element {
  const { filter } = useLocalSearchParams<{ filter?: string }>();
  return (
    <AgentListScreen filter={filter === 'not-installed' ? filter : undefined} />
  );
}
