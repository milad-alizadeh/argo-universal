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
import { useFocusEffect, useNavigation } from 'expo-router';
import {
  CommonActions,
  DrawerActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import type * as React from 'react';
import { useCallback, type PropsWithChildren } from 'react';
import { View } from 'react-native';

interface OpenFirstPageProps {
  useFirstPage: NonNullable<SectionList['useFirstPage']>;
}

type StackNavigation = NavigationProp<ParamListBase>;

function resetOverIndex(navigation: StackNavigation, first: FirstPage): void {
  const routes = [
    { name: 'index' },
    { name: first.page, params: first.params },
  ];

  // The router no longer completes a partial state, so the stack's own state carries the new routes.
  const stack = navigation.getState();

  navigation.dispatch(CommonActions.reset({ ...stack, index: 1, routes }));
}

/*
 * Not from the focus effect itself: a section's stack is mounted before it is shown (`lazy: false`), so the effect runs in the
 * commit that shows it, and a reset dispatched there is dropped by the router. One microtask later it lands.
 */
function resetOverIndexSoon(
  navigation: StackNavigation,
  first: FirstPage,
): () => void {
  let current = true;

  queueMicrotask(() => {
    if (current) resetOverIndex(navigation, first);
  });

  return () => {
    current = false;
  };
}

// Opens `first` over the section's index each time the index is focused; the index stays below it for a narrow window's Back.
function useOpenOverIndex(first: FirstPage | undefined): void {
  const navigation = useNavigation<StackNavigation>();

  useFocusEffect(
    useCallback(
      () => (first ? resetOverIndexSoon(navigation, first) : undefined),
      [navigation, first],
    ),
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
