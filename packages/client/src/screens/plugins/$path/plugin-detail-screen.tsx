import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { Redirect, router, usePathname } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { useKeepSidebarWhileOpening } from '#features/frame';
import { showsBack } from '../plugin-back';
import { pluginPagePath } from '../plugin-page-route';
import { usePluginOpener } from '../use-plugin-opener';
import {
  pluginPath,
  usePluginAt,
  type PluginSection,
} from '../use-plugin-sections';
import { usePluginView } from '../use-plugin-view';
import {
  PluginDetailView,
  type PluginPageCallbacks,
} from './plugin-detail-view';

interface PluginDetailScreenProps {
  // The catch-all route's segments: Plugin id, nav id, then the page's own path.
  path: readonly string[];
  // The Session the page opened for, such as from a Session header action.
  sessionId: string | undefined;
  // The Project the page opened for, such as from a Project details row (ADR-0046).
  projectId: string | undefined;
}

const unavailable = { title: 'This Plugin is not available' };

// A Plugin page from the connected Server's list: blank until the list arrives; a Plugin the Server no longer lists says so and returns to Sessions.
export function PluginDetailScreen(
  props: PluginDetailScreenProps,
): React.JSX.Element {
  const { section, root, loaded } = usePluginAt(pluginPath(props.path));
  useKeepSidebarWhileOpening();

  if (section) return <PluginPage {...props} section={section} root={root} />;

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

type PluginPageProps = PluginDetailScreenProps & {
  section: PluginSection;
  // The page is its nav item's root.
  root: boolean;
};

// The route is the Plugin id, the nav id, then the page's own path, which is what the Plugin registered.
function PluginPage(props: PluginPageProps): React.JSX.Element {
  const { section } = props;

  const view = usePluginView({
    pluginId: section.pluginId,
    path: pluginPagePath(props.path),
    sessionId: props.sessionId,
    projectId: props.projectId,
  });

  return (
    <PluginDetailView
      {...pluginPageProps(section, view, usePluginOpener()(section.pluginId))}
      onBack={usePushedBack(props.root)}
    />
  );
}

/*
 * Every Plugin page above its nav item's root gets the App's Back when the stack can go back, so a drill-in page is
 * always reversible and no Plugin declares navigation. The root is a rail section's root, which draws none.
 */
function usePushedBack(root: boolean): (() => void) | null {
  // The path is what changes as the stack moves, so reading it keeps this answer current.
  usePathname();

  return showsBack(root, router.canGoBack()) ? () => router.back() : null;
}

function PluginUnavailable(): React.JSX.Element {
  useErrorToast(unavailable);

  return <Redirect href="/sessions" />;
}

function pluginPageProps(
  section: PluginSection,
  view: ReturnType<typeof usePluginView>,
  onOpenPage: PluginPageCallbacks['onOpenPage'],
): React.ComponentProps<typeof PluginDetailView> {
  return {
    title: section.title,
    viewId: view.viewId,
    root: view.root,
    callbacks: { onEvent: view.dispatch, onOpenPage },
  };
}
