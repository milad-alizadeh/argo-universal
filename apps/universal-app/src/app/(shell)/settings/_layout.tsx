import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { PhoneStack } from '@/navigation/phone-stack';

// On a phone, a Settings page opened directly still has the Settings list below it to go back to.
export const unstable_settings = { anchor: 'index' };

export default function SettingsLayout(): React.JSX.Element {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;
  return (
    <PhoneStack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerBackVisible: false,
          ...(Platform.OS === 'android' && {
            headerTitleStyle: { fontSize: 22, fontWeight: '400' },
            headerTitleAlign: 'left',
          }),
        }}
      />
      <Stack.Screen name="projects/index" options={{ title: 'Projects' }} />
      <Stack.Screen name="agents/index" options={{ title: 'Agents' }} />
      <Stack.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Stack.Screen name="connection" options={{ title: 'Connection' }} />
      <Stack.Screen
        name="projects/[name]"
        options={{ title: 'Project settings' }}
      />
      <Stack.Screen name="agents/new" options={{ title: 'Add custom Agent' }} />
      <Stack.Screen name="agents/[agent]" options={{ title: 'Agent' }} />
      <Stack.Screen name="devices" options={{ title: 'Devices' }} />
      <Stack.Screen name="appearance" options={{ title: 'Appearance' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
    </PhoneStack>
  );
}
