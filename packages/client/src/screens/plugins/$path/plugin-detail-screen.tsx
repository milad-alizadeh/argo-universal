import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { Redirect } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { pluginPagePath } from '../plugin-page-route';
import { usePluginOpener } from '../use-plugin-opener';
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

  if (section) return <PluginPage section={section} path={path} />;

  return loaded ? <PluginUnavailable /> : <PluginLoading />;
}

// The header is declared while the list loads, so a narrow root still has ☰ and a pushed page its Back.
function PluginLoading(): React.JSX.Element {
  return (
    <>
      <ScreenStackHeader />
      <View className="flex-1 bg-content" />
    </>
  );
}

// The route is the Plugin id, the nav id, then the page's own path, which is what the Plugin registered.
function PluginPage({
  section,
  path,
}: PluginDetailScreenProps & {
  section: PluginSection;
}): React.JSX.Element {
  const view = usePluginView(section.pluginId, pluginPagePath(path));
  const onOpenPage = usePluginOpener()(section.pluginId);

  return (
    <PluginDetailView
      {...pluginPageProps(section, view)}
      onOpenPage={onOpenPage}
    />
  );
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
