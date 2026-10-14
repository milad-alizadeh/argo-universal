import { AgentModelSheetPage } from '@repo/client';
import { useNavigation } from 'expo-router';
import type * as React from 'react';
import { useCallback } from 'react';
import { useConfigureSheetHeight } from '@/navigation/use-configure-sheet-height';

// The options a Configure row drills into, such as the Agents.
export default function AgentModelChoicePage(): React.JSX.Element {
  const navigation = useNavigation();

  const onTitle = useCallback(
    (title: string) => navigation.setOptions({ title }),
    [navigation],
  );

  return (
    <AgentModelSheetPage
      onTitle={onTitle}
      onContentHeightChange={useConfigureSheetHeight()}
    />
  );
}
