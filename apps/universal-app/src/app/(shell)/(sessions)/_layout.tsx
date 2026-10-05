import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';

// On a phone, a Session opened directly still has the Sessions list below it to go back to.
export const unstable_settings = { anchor: 'index' };

export default function SessionsLayout() {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Sessions', headerShown: false }}
      />
      <Stack.Screen name="sessions/new" options={{ title: 'New Session' }} />
      <Stack.Screen name="sessions/[id]" options={{ title: 'Session' }} />
    </Stack>
  );
}
