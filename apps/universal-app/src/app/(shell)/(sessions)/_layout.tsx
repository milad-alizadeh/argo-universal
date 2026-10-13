import { useWide } from '@repo/client';
import { newSessionId } from '@repo/client/navigation';
import { Slot, Stack } from 'expo-router';
import type * as React from 'react';
import { PhoneStack } from '@/navigation/phone-stack';

// On a phone, a Session opened directly still has the Sessions list below it to go back to.
export const unstable_settings = { anchor: 'index' };

// New Session has no title until its first prompt gives the Session one.
const sessionScreenOptions = ({
  route,
}: {
  route: { params?: object };
}): { title: string } => ({
  title:
    Reflect.get(route.params ?? {}, 'id') === newSessionId ? '' : 'Session',
});

export default function SessionsLayout(): React.JSX.Element {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;
  return (
    <PhoneStack>
      <Stack.Screen name="index" options={{ title: 'Sessions' }} />
      <Stack.Screen name="sessions/[id]" options={sessionScreenOptions} />
    </PhoneStack>
  );
}
