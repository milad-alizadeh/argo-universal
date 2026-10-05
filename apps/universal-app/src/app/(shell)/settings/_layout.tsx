import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';

// On a phone, a Settings page opened directly still has the Settings list below it to go back to.
export const unstable_settings = { anchor: 'index' };

export default function SettingsLayout() {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: 'Settings', headerShown: false }}
      />
      <Stack.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Stack.Screen name="connection" options={{ title: 'Connection' }} />
      <Stack.Screen
        name="projects/[name]"
        options={{ title: 'Project settings' }}
      />
      <Stack.Screen name="agents/[agent]" options={{ title: 'Agent' }} />
    </Stack>
  );
}
