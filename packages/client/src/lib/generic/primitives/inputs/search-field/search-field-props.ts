import type { TextInputProps } from 'react-native';
import type { KitProps } from '../../kit-props';

export type SearchFieldProps = KitProps<'SearchField'> &
  Pick<TextInputProps, 'onFocus' | 'onBlur'>;

export type SearchQueryProps = Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText'
>;
