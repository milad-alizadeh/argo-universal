import { DeviceDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function DeviceRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <DeviceDetailScreen deviceId={id} />;
}
