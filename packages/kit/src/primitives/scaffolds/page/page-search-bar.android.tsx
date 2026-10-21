import { Stack } from 'expo-router';
import type { ReactElement } from 'react';
import type { PageProps } from './page-props';
import { usePageSearchBar } from './use-page-search-bar';

export function PageSearchBar(props: PageProps): ReactElement {
  return <Stack.SearchBar {...usePageSearchBar(props)} autoCapitalize="none" />;
}
