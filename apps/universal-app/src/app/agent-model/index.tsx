import { AgentModelSheetSettings } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';
import { useConfigureSheetHeight } from '@/navigation/use-configure-sheet-height';

const openPage = (): void => router.push('/agent-model/choice');

const back = (): void => router.back();

export default function AgentModelSettingsPage(): React.JSX.Element {
  return (
    <AgentModelSheetSettings
      onOpenPage={openPage}
      onBack={back}
      onContentHeightChange={useConfigureSheetHeight()}
    />
  );
}
