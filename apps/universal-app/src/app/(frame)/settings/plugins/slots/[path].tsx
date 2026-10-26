import { SlotSettingsScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function SlotSettingsRoute(): React.JSX.Element {
  const { path } = useLocalSearchParams<{ path: string }>();

  return <SlotSettingsScreen path={path} />;
}
