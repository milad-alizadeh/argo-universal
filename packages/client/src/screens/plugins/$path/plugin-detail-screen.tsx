import { Redirect } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { useErrorToast } from '#primitives/overlays/toast';
import {
  pluginPath,
  usePluginAt,
  type PluginSection,
} from '../use-plugin-sections';
import { usePluginView } from '../use-plugin-view';
import { PluginDetailView } from './plugin-detail-view';

interface PluginDetailScreenProps {
  // The catch-all route's segments: Plugin id, nav id, then the page's own path.
  path: readonly string[];
}

const unavailable = { title: 'This Plugin is not available' };

// A Plugin page from the connected Server's list: blank until the list arrives; a Plugin the Server no longer lists says so and returns to Sessions.
export function PluginDetailScreen({
  path,
}: PluginDetailScreenProps): React.JSX.Element {
  const { section, loaded } = usePluginAt(pluginPath(path));

  if (section) return <PluginPage section={section} />;

  return loaded ? (
    <PluginUnavailable />
  ) : (
    <View className="flex-1 bg-content" />
  );
}

function PluginPage({
  section,
}: {
  section: PluginSection;
}): React.JSX.Element {
  const view = usePluginView(
    section.pluginId,
    `/${section.segments.slice(2).join('/')}`,
  );

  return <PluginDetailView {...pluginPageProps(section, view)} />;
}

function PluginUnavailable(): React.JSX.Element {
  useErrorToast(unavailable);

  return <Redirect href="/sessions" />;
}

function pluginPageProps(
  section: PluginSection,
  view: ReturnType<typeof usePluginView>,
): React.ComponentProps<typeof PluginDetailView> {
  return {
    title: section.title,
    viewId: view.viewId,
    root: view.root,
    onEvent: view.dispatch,
  };
}
