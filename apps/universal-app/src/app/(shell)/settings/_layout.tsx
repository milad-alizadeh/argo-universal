import { useWide } from '@repo/client';
import { Slot, Stack } from 'expo-router';
import type * as React from 'react';
import { Platform } from 'react-native';
import { PhoneStack } from '@/navigation/phone-stack';

// On a phone, a Settings page opened directly still has the Settings list below it to go back to.
export const unstable_settings = { anchor: 'index' };

const settingsIndexOptions = {
  headerBackVisible: false,
  ...(Platform.OS === 'android' && { headerTitleAlign: 'left' as const }),
};

export default function SettingsLayout(): React.JSX.Element {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;

  return (
    <PhoneStack>
      <Stack.Screen name="index" options={settingsIndexOptions} />
    </PhoneStack>
  );
}
