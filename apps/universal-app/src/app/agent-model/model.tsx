import { AgentModelSheetChoices } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';

export default function AgentModelModelPage(): React.JSX.Element {
  return <AgentModelSheetChoices page="model" onDone={() => router.back()} />;
}
