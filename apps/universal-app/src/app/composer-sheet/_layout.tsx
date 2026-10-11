import { useSheetLabel } from '@repo/client';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { useSheetHeaderOptions } from '@/navigation/sheet-header';

// Any Composer menu other than Agent and model; a stack of its own gives it a native header on Android too.
export default function ComposerSheetLayout(): React.JSX.Element {
  const screenOptions = useSheetHeaderOptions();
  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen
        name="index"
        options={{ title: useSheetLabel(), headerBackVisible: false }}
      />
    </Stack>
  );
}
