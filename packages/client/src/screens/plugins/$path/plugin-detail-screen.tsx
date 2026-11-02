import { createPlace } from '@repo/kit/place';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { ListDetailSidebarPlaceOffer } from '@repo/kit/primitives/scaffolds/list-detail';
import { ScreenStackHeader } from '@repo/kit/primitives/scaffolds/screen';
import { useWide } from '@repo/kit/use-wide/use-wide';
import { Redirect, router } from 'expo-router';
import { useLayoutEffect, type ReactNode } from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import { showsBack } from '../plugin-back';
import { pluginPagePath, pluginPageRoute } from '../plugin-page-route';
import { landingOf, withoutList } from '../plugin-section-tree';
import { useSectionRoot } from '../plugin-section-view';
import { usePluginOpener } from '../use-plugin-opener';
import {
  pluginPath,
  usePluginAt,
  usePluginSections,
  type PluginSection,
} from '../use-plugin-sections';
import { usePluginView, type PluginView } from '../use-plugin-view';
import { PluginDetailView } from './plugin-detail-view';
import { useSectionStackPage, type SectionStackPage } from './use-section-stack';

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
  const openedForOne = Boolean(props.sessionId ?? props.projectId);
  const stack = useSectionStackPage();

  if (useWide() && props.root && !openedForOne)
    return <SectionRootPage {...props} stack={stack} />;

  return <OwnViewPage {...props} stack={stack} openedForOne={openedForOne} />;
}

type StackPageProps = PluginPageProps & { stack: SectionStackPage };

// The route is the Plugin id, the nav id, then the page's own path, which is what the Plugin registered.
function OwnViewPage(
  props: StackPageProps & { openedForOne: boolean },
): React.JSX.Element {
  const { section, stack } = props;

  const view = usePluginView(
    {
      pluginId: section.pluginId,
      path: pluginPagePath(props.path),
      sessionId: props.sessionId,
      projectId: props.projectId,
    },
    stack.needed,
  );

  return (
    <PluginDetailView
      {...pluginPageProps(section, view, usePluginOpener()(section.pluginId))}
      onBack={backFor(props)}
    />
  );
}

// The list is already in the sidebar, so the root's own page claims nowhere and draws what sits beside it.
const listElsewhere = createPlace<ReactNode>();

function SectionRootPage(props: StackPageProps): React.ReactNode {
  const { section, stack } = props;
  const view = useSectionRoot(section);
  const onOpenPage = usePluginOpener()(section.pluginId);
  const landing = useLanding(section, view?.root ?? null, stack);

  if (!view || landing) return <PluginLoading />;

  return (
    <ListDetailSidebarPlaceOffer value={listElsewhere}>
      <PluginDetailView
        {...pluginPageProps(
          section,
          { ...view, root: view.root && withoutList(view.root) },
          onOpenPage,
        )}
      />
    </ListDetailSidebarPlaceOffer>
  );
}

// The page a section's root declares takes the root's place in the stack as soon as the root is shown, so a wide window never lands on an empty detail.
function useLanding(
  section: PluginSection,
  root: PluginView['root'],
  { shown, showOnly }: SectionStackPage,
): boolean {
  const sections = usePluginSections();
  const landing = landingOf(root);
  const route =
    landing === undefined
      ? undefined
      : pluginPageRoute(
          sections,
          { pluginId: section.pluginId, current: section.id },
          landing,
        );
  const opening = route?.join('/');

  useLayoutEffect(() => {
    if (shown && opening !== undefined) showOnly(opening.split('/'));
  }, [shown, opening, showOnly]);

  return route !== undefined;
}

/*
 * A page draws the App's Back when something sits below it in its section's stack, so a pushed page is always reversible
 * and no Plugin declares navigation; a page a Session or Project opened goes back there. The root is a rail section's
 * root, which draws none, and so does a page a sidebar tap opened, which is its stack's only page.
 */
function backFor(props: StackPageProps & { openedForOne: boolean }) {
  const pushed = props.stack.below > 0 || props.openedForOne;

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
