import { AgentModelSheetSettings } from '@repo/client';
import { router } from 'expo-router';
import type * as React from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useSheetHeight } from '@/navigation/use-sheet-height';

const minimumHeight = { ios: 414, android: 476 };

export default function AgentModelSettingsPage(): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  return (
    <AgentModelSheetSettings
      onOpenPage={(page) => router.push(`/agent-model/${page}`)}
      onContentHeightChange={useSheetHeight(
        (Platform.OS === 'ios' ? minimumHeight.ios : minimumHeight.android) *
          fontScale,
      )}
    />
  );
}
