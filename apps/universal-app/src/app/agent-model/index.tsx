import { AgentModelSheetSettings } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';
import { useSheetHeight } from '@/navigation/use-sheet-height';

export default function AgentModelSettingsPage(): React.JSX.Element {
  return (
    <AgentModelSheetSettings
      onOpenPage={(page) => router.push(`/agent-model/${page}`)}
      onContentHeightChange={useSheetHeight()}
    />
  );
}
