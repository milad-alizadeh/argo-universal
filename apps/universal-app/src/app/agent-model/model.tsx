import { AgentModelSheetChoices } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';
import { useConfigureSheetHeight } from '@/navigation/use-configure-sheet-height';

export default function AgentModelModelPage(): React.JSX.Element {
  return (
    <AgentModelSheetChoices
      page="model"
      onDone={() => router.back()}
      onContentHeightChange={useConfigureSheetHeight()}
    />
  );
}
