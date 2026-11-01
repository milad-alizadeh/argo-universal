import type { ReactElement, ReactNode } from 'react';
import { Platform, View } from 'react-native';
import {
  SearchField,
  type SearchFieldProps,
} from '#primitives/controls/search-field';
import type { ScreenProps } from './screen-props';

interface SearchHeadingProps {
  content: { title: ReactNode; actions: ReactNode };
  page: ScreenProps;
  // A list column's search is the sidebar's on the web: its button first, before the actions.
  sidebar: boolean;
}

export function SearchHeading(props: SearchHeadingProps): ReactElement {
  return (
    <View className="min-h-10 flex-row items-center">
      <SearchField
        {...searchQuery(props.page)}
        sidebar={props.sidebar && Platform.OS === 'web'}
        title={props.content.title}
        actions={props.content.actions}
      />
    </View>
  );
}

function searchQuery(
  page: ScreenProps,
): Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText' | 'onFocus' | 'onBlur'
> {
  return {
    label: searchLabel(page),
    value: searchValue(page),
    onChangeText: page.onChangeText ?? ignoreSearch,
    onFocus: page.onFocus,
    onBlur: page.onBlur,
  };
}

function ignoreSearch(): void {}

function searchLabel(page: ScreenProps): string {
  return page.search?.label ?? 'Search';
}

function searchValue(page: ScreenProps): string {
  return page.value ?? '';
}
