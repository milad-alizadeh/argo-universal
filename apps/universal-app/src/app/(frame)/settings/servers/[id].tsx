import { ServerDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function ServerRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <ServerDetailScreen serverId={id} />;
}
