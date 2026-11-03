import { createPlace } from '@repo/kit/place';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { ListDetailSidebarPlaceOffer } from '@repo/kit/primitives/scaffolds/list-detail';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { Redirect, router } from 'expo-router';
import { useMemo, type ReactNode } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { pluginPagePath } from '../plugin-page-route';
import {
  useSectionRoot,
  useSectionStackPage,
  type SectionStackPage,
} from '../plugin-section-stack';
import { withoutList } from '../plugin-section-tree';
import { showsBack } from '../plugin-stack-page';
import { usePluginOpener } from '../use-plugin-opener';
import {
  pluginPath,
  usePluginAt,
  type PluginSection,
} from '../use-plugin-sections';
import { usePluginView, type PluginView } from '../use-plugin-view';
import { PluginDetailView } from './plugin-detail-view';

interface PluginDetailScreenProps {
  // The catch-all route's segments: Plugin id, nav id, then the page's own path.
  path: readonly string[];
  // The Session the page opened for, such as from a Session header action.
  sessionId: string | undefined;
  // The Project the page opened for, such as from a Project details row (ADR-0046).
  projectId: string | undefined;
  // The window has its section's list beside its pages.
  wide: boolean;
}

const unavailable = { title: 'This Plugin is not available' };

// A Plugin page from the connected Server's list: blank until the list arrives; a Plugin the Server no longer lists says so and returns to Sessions.
export function PluginDetailScreen(
  props: PluginDetailScreenProps,
): React.JSX.Element {
  const { section, root, loaded } = usePluginAt(pluginPath(props.path));

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

// On a wide window a section's root is already open beside its pages, so its page draws that view; any other page watches its own.
function PluginPage(props: PluginPageProps): React.JSX.Element {
  const stack = useSectionStackPage();

  return drawsSectionRoot(props) ? (
    <SectionRootPage section={props.section} stack={stack} />
  ) : (
    <OwnViewPage {...props} stack={stack} />
  );
}

const openedForOne = (props: PluginPageProps): boolean =>
  Boolean(props.sessionId ?? props.projectId);

const drawsSectionRoot = (props: PluginPageProps): boolean =>
  props.wide && props.root && !openedForOne(props);

type StackPageProps = PluginPageProps & { stack: SectionStackPage };

// The route is the Plugin id, the nav id, then the page's own path, which is what the Plugin registered.
function OwnViewPage(props: StackPageProps): React.JSX.Element {
  const { section, stack } = props;
  const view = usePluginView(ownViewOf(props), stack.live);
  const onOpenPage = usePluginOpener()(section.pluginId);

  return (
    <PluginDetailView
      {...pluginPageProps(section, view, onOpenPage)}
      onBack={backFor(props)}
    />
  );
}

const ownViewOf = (
  props: PluginPageProps,
): Parameters<typeof usePluginView>[0] => ({
  pluginId: props.section.pluginId,
  path: pluginPagePath(props.path),
  sessionId: props.sessionId,
  projectId: props.projectId,
});

// The list is already in the sidebar, so the root's own page claims nowhere and draws what sits beside it.
const listElsewhere = createPlace<ReactNode>();

function SectionRootPage(props: {
  section: PluginSection;
  stack: SectionStackPage;
}): React.ReactNode {
  const view = useSectionRoot(props.section, props.stack);

  if (!view) return <PluginLoading />;

  return <SectionRootDetail section={props.section} view={view} />;
}

function SectionRootDetail(props: {
  section: PluginSection;
  view: PluginView;
}): React.JSX.Element {
  const { section, view } = props;
  const root = useMemo(() => view.root && withoutList(view.root), [view.root]);
  const onOpenPage = usePluginOpener()(section.pluginId);

  return (
    <ListDetailSidebarPlaceOffer value={listElsewhere}>
      <PluginDetailView
        {...pluginPageProps(section, { ...view, root }, onOpenPage)}
      />
    </ListDetailSidebarPlaceOffer>
  );
}

/*
 * A page draws the App's Back when something sits below it in its section's stack, so a pushed page is always reversible
 * and no Plugin declares navigation; a page a Session or Project opened goes back there while there is somewhere to go,
 * which a reload of it leaves none of. The root is a rail section's root, which draws none, and so does a page a sidebar
 * tap opened, which is its stack's only page.
 */
const goesBackToOne = (props: PluginPageProps): boolean =>
  openedForOne(props) && router.canGoBack();

function backFor(props: StackPageProps): (() => void) | null {
  const pushed = props.stack.below > 0 || goesBackToOne(props);

  return showsBack(props.root, pushed) ? () => router.back() : null;
}

function PluginUnavailable(): React.JSX.Element {
  useErrorToast(unavailable);

  return <Redirect href="/sessions" />;
}

function pluginPageProps(
  section: PluginSection,
  view: PluginView,
  onOpenPage: React.ComponentProps<
    typeof PluginDetailView
  >['callbacks']['onOpenPage'],
): React.ComponentProps<typeof PluginDetailView> {
  return {
    title: section.title,
    viewId: view.viewId,
    root: view.root,
    callbacks: { onEvent: view.dispatch, onOpenPage },
  };
}
