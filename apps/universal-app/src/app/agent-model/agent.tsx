import { AgentModelSheetChoices } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';

export default function AgentModelAgentPage(): React.JSX.Element {
  return <AgentModelSheetChoices page="agent" onDone={() => router.back()} />;
}
