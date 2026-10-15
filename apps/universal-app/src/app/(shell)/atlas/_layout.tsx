import { useWide } from '@repo/client';
import { Slot } from 'expo-router';
import type * as React from 'react';
import { PhoneStack } from '@/navigation/phone-stack';

export default function AtlasLayout(): React.JSX.Element {
  if (useWide()) return <Slot />;

  return <PhoneStack />;
}
