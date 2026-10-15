import {
  type FirstPage,
  type Section,
  type SectionList,
  useNeedsAttention,
  useSectionList,
  useWide,
} from '@repo/client';
import { ImpactFeedbackStyle, impactAsync } from 'expo-haptics';
import { Stack, useFocusEffect, useNavigation } from 'expo-router';
import { CommonActions, DrawerActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useCallback } from 'react';
import { Platform, View } from 'react-native';

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
  section: Section;
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
function MenuToolbar(): React.JSX.Element {
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

// Only iOS's root header takes stock items: Android's drawer header and the web's JS header draw the section's header props.
const stockRootItems = Platform.OS === 'ios';

// iOS's narrow root page fills its own header: ☰, then the section's items and search.
function RootToolbar({ section }: SectionRootProps): React.ReactNode {
  const { rootToolbar } = useSectionList(section);

  return (
    <>
      <MenuToolbar />
      {rootToolbar}
    </>
  );
}

const RootItems = stockRootItems ? RootToolbar : (): null => null;

interface RootListProps extends SectionRootProps {
  narrow: boolean;
}

// The section's list, under the section's header on a narrow window.
function RootList({ section, narrow }: RootListProps): React.JSX.Element {
  return (
    <View className="flex-1 bg-content">
      {useSectionList(section).list}
      {narrow ? <RootItems section={section} /> : null}
    </View>
  );
}

// A section's root page: its list under the section's header on a narrow window; on a wide one, where the list sits beside the pages, the section's first page, which the section's list names.
export function SectionRoot({ section }: SectionRootProps): React.ReactNode {
  const { useFirstPage } = useSectionList(section);
  const wide = useWide();

  if (wide && useFirstPage) {
    return <OpenFirstPage useFirstPage={useFirstPage} />;
  }

  return <RootList section={section} narrow={!wide} />;
}
