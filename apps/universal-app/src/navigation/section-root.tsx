import {
  type FirstPage,
  type CoreSection,
  EmptyState,
  type SectionList,
  useNeedsAttention,
  useSectionList,
} from '@repo/client';
import { useWide } from '@repo/client/size-class';
import {
  ScreenMenuContext,
  type ScreenMenu,
} from '@repo/kit/primitives/scaffolds/screen';
import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { useFocusEffect, useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  DrawerActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import type * as React from 'react';
import { useCallback, useLayoutEffect, type PropsWithChildren } from 'react';
import { View } from 'react-native';

interface OpenFirstPageProps {
  useFirstPage: NonNullable<SectionList['useFirstPage']>;
}

// Opens `first` over the section's index each time the index is focused; the index stays below it for a narrow window's Back.
function useOpenOverIndex(first: FirstPage | undefined): void {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  useFocusEffect(
    useCallback(() => {
      if (!first) return;

      const routes = [
        { name: 'index' },
        { name: first.page, params: first.params },
      ];

      // The router no longer completes a partial state, so the stack's own state carries the new routes.
      const stack = navigation.getState();

      navigation.dispatch(CommonActions.reset({ ...stack, index: 1, routes }));
    }, [navigation, first]),
  );
}

// Opens the section's first page, so the URL names the page shown; blank while the page is chosen, so no page flashes.
function OpenFirstPage({ useFirstPage }: OpenFirstPageProps): React.ReactNode {
  useOpenOverIndex(useFirstPage());

  return <View className="flex-1 bg-content" />;
}

interface SectionRootProps {
  section: CoreSection;
}

/*
 * A page opened by its address has this root added below it so Back has somewhere to go, and the router gives the root
 * the page's params (`name`, `id`). The root has no such param, so its address would show it as a query string. It also
 * skips the page's own list (Projects between Settings and a Project). The stack is reset without the params and with
 * the list in between, once, as the page opens. It is placed in the page's own layout, not in the root: the root below
 * a page mounts later, and a reset made then, from the stack as it was, put back a page that a quick Back had just
 * left. From the page's first commit, the reset is queued before any Back can be.
 */
export function RepairDeepLinkStack(): null {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { key } = useRoute();

  useLayoutEffect(() => {
    const stack = navigation.getState();
    const routes = repairedRoutes(stack, key);

    if (!routes) return;

    navigation.dispatch(
      CommonActions.reset({ ...stack, index: routes.length - 1, routes }),
    );
  }, [navigation, key]);

  return null;
}

type Stack = ReturnType<NavigationProp<ParamListBase>['getState']>;

type Route = Stack['routes'][number];

// Only a stack of the root and one page, the root carrying that page's params, is one opened by its address.
const openedByAddress = (routes: Stack['routes']): routes is [Route, Route] =>
  routes.length === 2 && Object.keys({ ...routes[0]?.params }).length > 0;

// Only for the page itself: the root below it mounts later, from a stack that may be stale by then.
function repairedRoutes(
  stack: Stack,
  pageKey: string,
): Stack['routes'] | undefined {
  const { routes } = stack;

  if (!openedByAddress(routes) || routes[1].key !== pageKey) return undefined;

  const [root, page] = routes;

  return [{ name: root.name, key: root.key }, ...listBelow(stack, page), page];
}

// The list a dynamic page belongs to, such as `projects/index` for `projects/[name]`, when the stack has it.
function listBelow(
  stack: Stack,
  page: Stack['routes'][number],
): Stack['routes'] {
  const folder = page.name.split('/').slice(0, -1);
  const list = [...folder, 'index'].join('/');

  return folder.length > 0 && stack.routeNames.includes(list)
    ? [{ key: `${list}-below`, name: list }]
    : [];
}

// ☰ opens the Frame's drawer, which the action reaches from a section's stack, with a light tap and a badge while Sessions need attention.
function useDrawerMenu(): ScreenMenu {
  const navigation = useNavigation();
  const badge = useNeedsAttention();

  return {
    badge,
    onOpen: () => {
      void impactAsync(ImpactFeedbackStyle.Light);
      navigation.dispatch(DrawerActions.openDrawer());
    },
  };
}

interface RootListProps extends SectionRootProps {
  narrow: boolean;
}

// The section's list, which on a narrow window is its root page: the list's Screen declares the header above it.
function RootList({ section, narrow }: RootListProps): React.JSX.Element {
  const { list } = useSectionList(section);

  return (
    <View className="flex-1 bg-content">
      {narrow ? <NarrowRoot>{list}</NarrowRoot> : list}
    </View>
  );
}

// A narrow root's page under ☰. The provider is what marks a root: a deep-linked page below it keeps its Back.
export function NarrowRoot({
  children,
  root = true,
}: PropsWithChildren<{ root?: boolean }>): React.JSX.Element {
  const menu = useDrawerMenu();

  return (
    <ScreenMenuContext value={root ? menu : null}>{children}</ScreenMenuContext>
  );
}

/*
 * A section's root page: its list under the section's header in the phone shell. Where the list
 * sits beside the pages, the section's empty detail until a page is picked, when it has one, or
 * else the section's first page, which the section's list names.
 */
export function SectionRoot({ section }: SectionRootProps): React.ReactNode {
  const wide = useWide();
  const besidePages = useBesidePages(section, wide);

  if (besidePages) return besidePages;

  return <RootList section={section} narrow={!wide} />;
}

// What the root shows where the list sits beside the pages, if anything.
function useBesidePages(section: CoreSection, wide: boolean): React.ReactNode {
  const list = useSectionList(section);

  if (!wide) return null;

  if (list.emptyPage) return <EmptyPage {...list.emptyPage} />;

  return firstPage(list);
}

const firstPage = ({ useFirstPage }: SectionList): React.ReactNode =>
  useFirstPage ? <OpenFirstPage useFirstPage={useFirstPage} /> : null;

type EmptyPageProps = NonNullable<SectionList['emptyPage']>;

function EmptyPage(props: EmptyPageProps): React.JSX.Element {
  return (
    <View testID="empty-detail" className="flex-1">
      <EmptyState {...props} />
    </View>
  );
}
