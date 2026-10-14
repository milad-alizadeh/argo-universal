import type { SettingsPageSearch } from '#lib/product/settings-page';
import type { DockedSearchQuery } from '#primitives/inputs/search-field/search-field';
import type { SearchedProps } from './project-list-props';

export const searchLabel = 'Search Projects';

// The Projects page is pushed from Settings, so a back button leads its header.
export const listSearch = (
  props: Pick<SearchedProps, 'search' | 'onSearch'>,
): DockedSearchQuery => ({
  label: searchLabel,
  value: props.search,
  onChangeText: props.onSearch,
  leading: 'back',
});

export const pageSearch = (
  props: Pick<SearchedProps, 'search' | 'onSearch'>,
): SettingsPageSearch => ({
  label: searchLabel,
  value: props.search,
  onChangeText: props.onSearch,
});
