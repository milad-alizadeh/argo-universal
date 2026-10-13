import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { PhoneStack } from '@/navigation/phone-stack';

// On a phone, a Settings page opened directly still has the Settings list below it to go back to.
export const unstable_settings = { anchor: 'index' };

const pageTitles = {
  'projects/index': 'Projects',
  'agents/index': 'Agents',
  accounts: 'Accounts',
  connection: 'Connection',
  'projects/[name]': 'Project settings',
  'agents/new': 'Add custom Agent',
  'agents/[agent]': 'Agent',
  devices: 'Devices',
  appearance: 'Appearance',
  notifications: 'Notifications',
};

const settingsIndexOptions = {
  title: 'Settings',
  headerBackVisible: false,
  ...(Platform.OS === 'android' && { headerTitleAlign: 'left' as const }),
};

export default function SettingsLayout(): React.JSX.Element {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;
  return (
    <PhoneStack>
      <Stack.Screen name="index" options={settingsIndexOptions} />
      {Object.entries(pageTitles).map(([name, title]) => (
        <Stack.Screen key={name} name={name} options={{ title }} />
      ))}
    </PhoneStack>
  );
}
