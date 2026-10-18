import { PluginSettingsDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function PluginRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <PluginSettingsDetailScreen pluginId={id} />;
}
