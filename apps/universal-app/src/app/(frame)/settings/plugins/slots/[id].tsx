import { SlotDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function SlotDetailRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <SlotDetailScreen slotId={id} />;
}
