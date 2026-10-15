import type { SettingsPageSearch } from '#lib/product/settings-page';
import type { SearchedProps } from './project-list-props';

export const searchLabel = 'Search Projects';

export const pageSearch = (
  props: Pick<SearchedProps, 'search' | 'onSearch'>,
): SettingsPageSearch => ({
  label: searchLabel,
  value: props.search,
  onChangeText: props.onSearch,
});
