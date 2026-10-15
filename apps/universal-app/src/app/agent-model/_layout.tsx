import { Stack } from 'expo-router';
import type * as React from 'react';
import { useResolveClassNames } from 'uniwind';
import { sheetHeaderOptions } from '@/navigation/sheet-header';

// The Agent and model sheet pushes its pages on a stack of its own.
export default function AgentModelLayout(): React.JSX.Element {
  return (
    <Stack screenOptions={useConfigureOptions()}>
      <Stack.Screen
        name="index"
        options={{ title: 'Configure', headerBackVisible: false }}
      />
      <Stack.Screen name="agent" options={{ title: 'Select Agent' }} />
      <Stack.Screen name="model" options={{ title: 'Select Model' }} />
    </Stack>
  );
}

function useConfigureOptions(): React.ComponentProps<
  typeof Stack
>['screenOptions'] {
  const surface = useResolveClassNames('bg-content');

  return {
    ...sheetHeaderOptions,
    headerTransparent: false,
    headerStyle: surface,
    contentStyle: surface,
  };
}
