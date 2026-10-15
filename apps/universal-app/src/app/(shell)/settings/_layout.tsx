import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import {
  type PageSurface,
  PhoneStack,
  pageSurfaceOptions,
} from '@/navigation/phone-stack';

// On a phone, a Settings page opened directly still has the Settings list below it to go back to.
export const unstable_settings = { anchor: 'index' };

interface SettingsPage {
  title: string;
  surface: PageSurface;
}

// Each page's title, and what it draws on: a grouped list, or a placeholder note on the content surface.
const pages = {
  'projects/index': { title: 'Projects', surface: 'grouped' },
  'agents/index': { title: 'Agents', surface: 'grouped' },
  accounts: { title: 'Accounts', surface: 'content' },
  connection: { title: 'Connection', surface: 'grouped' },
  'projects/[name]': { title: 'Project settings', surface: 'grouped' },
  'agents/new': { title: 'Add custom Agent', surface: 'grouped' },
  'agents/[agent]': { title: 'Agent', surface: 'grouped' },
  devices: { title: 'Devices', surface: 'content' },
  appearance: { title: 'Appearance', surface: 'content' },
  notifications: { title: 'Notifications', surface: 'content' },
} satisfies Record<string, SettingsPage>;

const settingsIndexOptions = {
  title: 'Settings',
  headerBackVisible: false,
  ...pageSurfaceOptions('grouped'),
  ...(Platform.OS === 'android' && { headerTitleAlign: 'left' as const }),
};

export default function SettingsLayout(): React.JSX.Element {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;

  return (
    <PhoneStack>
      <Stack.Screen name="index" options={settingsIndexOptions} />
      {Object.entries(pages).map(([name, { title, surface }]) => (
        <Stack.Screen
          key={name}
          name={name}
          options={{ title, ...pageSurfaceOptions(surface) }}
        />
      ))}
    </PhoneStack>
  );
}
