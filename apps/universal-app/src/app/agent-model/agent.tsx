import { AgentModelSheetAgents } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';

export default function AgentModelAgentPage(): React.JSX.Element {
  return <AgentModelSheetAgents onDone={() => router.back()} />;
}
