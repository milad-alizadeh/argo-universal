import type { KitProps } from '../../kit-props';

export type SearchFieldProps = KitProps<'SearchField'>;

export type SearchQueryProps = Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText'
>;
