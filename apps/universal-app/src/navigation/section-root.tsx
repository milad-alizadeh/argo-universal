import {
  type FirstPage,
  SearchDock,
  type Section,
  type SectionList,
  useSectionList,
  useWide,
} from '@repo/client';
import { useFocusEffect, useNavigation } from 'expo-router';
import { CommonActions } from 'expo-router/react-navigation';
import type * as React from 'react';
import { useCallback } from 'react';
import { View } from 'react-native';

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

// A section's root page: its list under the section's header on a narrow window, with iOS 26's docked search; on a wide one, where the list sits beside the pages, the section's first page, which the section's list names.
export function SectionRoot({ section }: SectionRootProps): React.ReactNode {
  const { list, rootHeader, useFirstPage } = useSectionList(section);

  if (useWide() && useFirstPage) {
    return <OpenFirstPage useFirstPage={useFirstPage} />;
  }

  return (
    <View className="flex-1 bg-content">
      {list}
      <SearchDock search={rootHeader.search} />
    </View>
  );
}
