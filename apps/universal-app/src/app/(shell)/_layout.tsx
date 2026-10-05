import { DesktopLayout, useWide } from '@repo/client';
import { Slot, Stack, usePathname } from 'expo-router';
import { destinationFor } from '@/navigation/paths';

// A detail URL opened directly still has its section list below it to go back to.
export const unstable_settings = { anchor: '(sections)' };

// Picks the shell by width. Stack and Slot share Expo Router's stack router, so the URL and its back stack survive the swap.
export default function ShellLayout() {
  const wide = useWide();
  const pathname = usePathname();
  if (wide)
    return (
      <DesktopLayout
        destination={destinationFor(pathname) ?? { to: 'sessions' }}
      >
        <Slot />
      </DesktopLayout>
    );
  return (
    <Stack>
      <Stack.Screen name="(sections)" options={{ headerShown: false }} />
      <Stack.Screen name="sessions/new" options={{ title: 'New Session' }} />
      <Stack.Screen name="sessions/[id]" options={{ title: 'Session' }} />
      <Stack.Screen name="settings/accounts" options={{ title: 'Accounts' }} />
      <Stack.Screen
        name="settings/connection"
        options={{ title: 'Connection' }}
      />
      <Stack.Screen
        name="settings/projects/[name]"
        options={{ title: 'Project settings' }}
      />
      <Stack.Screen
        name="settings/agents/[agent]"
        options={{ title: 'Agent' }}
      />
    </Stack>
  );
}
