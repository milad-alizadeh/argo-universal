import { useWide } from '@repo/client';
import { Slot } from 'expo-router';
import type * as React from 'react';
import { PhoneStack } from '@/navigation/phone-stack';

// On a phone, a Settings page opened directly still has the Settings list below it to go back to.
export const unstable_settings = { anchor: 'index' };

export default function SettingsLayout(): React.JSX.Element {
  // A wide window draws the list in the sidebar and one page beside it, so nothing stacks.
  if (useWide()) return <Slot />;

  return <PhoneStack />;
}
