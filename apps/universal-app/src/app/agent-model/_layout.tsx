import { Stack } from 'expo-router';
import type * as React from 'react';
import { useSheetHeaderOptions } from '@/navigation/sheet-header';

// The Agent and model sheet pushes its pages on a stack of its own.
export default function AgentModelLayout(): React.JSX.Element {
  const screenOptions = useSheetHeaderOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: 'Configure', headerBackVisible: false }}
      />
      <Stack.Screen name="agent" options={{ title: 'Select Agent' }} />
      <Stack.Screen name="model" options={{ title: 'Select Model' }} />
    </Stack>
  );
}
