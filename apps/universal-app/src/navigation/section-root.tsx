import {
  PageAtDrawerRoot,
  type FirstPage,
  type CoreSection,
  EmptyState,
  type SectionList,
  useNeedsAttention,
  useSectionList,
} from '@repo/client';
import { useWide } from '@repo/client/size-class';
import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import { CommonActions, DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useCallback, type PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import { drawerDrawsRootHeader } from './section-drawer-options';

interface OpenFirstPageProps {
  useFirstPage: NonNullable<SectionList['useFirstPage']>;
}

// Opens `first` over the section's index each time the index is focused; the index stays below it for a narrow window's Back.
function useOpenOverIndex(first: FirstPage | undefined): void {
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      if (!first) return;

      const routes = [
        { name: 'index' },
        { name: first.page, params: first.params },
      ];

      navigation.dispatch(CommonActions.reset({ index: 1, routes }));
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

// A light tap, then the Frame's drawer, which the action reaches from a section's stack.
function useOpenDrawer(): () => void {
  const navigation = useNavigation();

  return () => {
    void impactAsync(ImpactFeedbackStyle.Light);
    navigation.dispatch(DrawerActions.openDrawer());
  };
}

// ☰ as a stock bar button item, which the system places like the back chevron, with the stock badge while Sessions need attention.
export function MenuToolbar(): React.JSX.Element {
  const badge = useNeedsAttention() ? <Stack.Toolbar.Badge /> : null;

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        icon="line.3.horizontal"
        accessibilityLabel="Open navigation"
        onPress={useOpenDrawer()}
      >
        {badge}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

// iOS's narrow root leads with ☰ as a stock item; Android's drawer header and the web's JS header draw their own.
const RootMenu = Platform.OS === 'ios' ? MenuToolbar : (): null => null;

interface RootListProps extends SectionRootProps {
  narrow: boolean;
}

// The section's list, or on a narrow window its root page when it has one, which fills the header above it.
function RootList({ section, narrow }: RootListProps): React.JSX.Element {
  const { list, rootPage } = useSectionList(section);

  return (
    <View className="flex-1 bg-content">
      {narrow ? <NarrowRoot>{rootPage ?? list}</NarrowRoot> : list}
    </View>
  );
}

// A narrow root's page under ☰; on Android its Page fills the drawer's header, which stands in for the stack's.
export function NarrowRoot({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <PageAtDrawerRoot value={drawerDrawsRootHeader}>
      {children}
      <RootMenu />
    </PageAtDrawerRoot>
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
