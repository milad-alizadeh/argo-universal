import { PluginSignInDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function PluginSignInRoute(): React.JSX.Element {
  const { id, page } = useLocalSearchParams<{ id: string; page: string }>();
  return <PluginSignInDetailScreen pluginId={id} page={page} />;
}
