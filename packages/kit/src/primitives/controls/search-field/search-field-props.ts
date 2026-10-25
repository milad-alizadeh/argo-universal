import type { TextInputProps } from 'react-native';
import type { KitProps } from '../../kit-props';

export type SearchFieldProps = KitProps<'SearchField'> &
  Pick<TextInputProps, 'onFocus' | 'onBlur'> & {
    /*
     * Kit-only, a desktop sidebar's header (Paper "SessionsList"): the search button comes first, before the actions,
     * and draws the 16 control glyph. The open field still covers the whole row.
     */
    sidebar?: boolean;
  };

export type SearchQueryProps = Pick<
  SearchFieldProps,
  'label' | 'value' | 'onChangeText'
>;
