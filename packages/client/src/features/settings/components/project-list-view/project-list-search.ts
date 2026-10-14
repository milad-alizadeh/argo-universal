import type { SettingsPageSearch } from '#lib/product/settings-page';
import type { ListSearchBarProps } from '#primitives/inputs/list-search-bar/list-search-bar';
import type { SearchedProps } from './project-list-props';

export const searchLabel = 'Search Projects';

// The Projects page is pushed from Settings, so a back button leads its header.
export const listSearch = (
  props: Pick<SearchedProps, 'search' | 'onSearch'>,
): ListSearchBarProps => ({
  placeholder: searchLabel,
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
