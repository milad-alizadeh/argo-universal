import type { SearchFieldProps } from './search-field-props';

type SearchFieldFixture = Omit<SearchFieldProps, 'onChangeText'>;

const label = 'Search Agents';

export const atRestSearchField = {
  label,
  value: '',
} satisfies SearchFieldFixture;

export const searchingSearchField = {
  label,
  value: 'review',
} satisfies SearchFieldFixture;
