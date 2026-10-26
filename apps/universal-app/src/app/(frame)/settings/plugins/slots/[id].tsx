import { SlotSettingsScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function SlotSettingsRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <SlotSettingsScreen slotId={id} />;
}
