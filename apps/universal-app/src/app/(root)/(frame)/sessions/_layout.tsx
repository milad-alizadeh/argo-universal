import { Stack } from 'expo-router';
import type * as React from 'react';
import { useNewSessionListeners } from '@/navigation/close-new-session';
import { SectionStack } from '@/navigation/section-stack';

// A page opened directly still has the list below it to go back to on a narrow window.
export const unstable_settings = { anchor: 'index' };

export default function SessionsLayout(): React.JSX.Element {
  return (
    <SectionStack section="sessions">
      <Stack.Screen name="[id]" listeners={useNewSessionListeners()} />
    </SectionStack>
  );
}
