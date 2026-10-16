import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';
import { PluginRoot } from '@/navigation/plugin-route';

export default function PluginRoute(): React.JSX.Element {
  const { path = [] } = useLocalSearchParams<{ path?: string[] }>();

  return <PluginRoot path={path} />;
}
