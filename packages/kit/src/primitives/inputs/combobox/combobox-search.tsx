import type * as React from 'react';
import { PageSearchField } from '#primitives/fields/field-picker';
import type { ComboboxSearchProps } from './combobox-search-props';

/*
 * The shared React Native filter for Combobox results on every platform (owner, 2026-10-15). It is the picker's
 * page search field; header and list search is SearchField.
 */
export function ComboboxSearch(props: ComboboxSearchProps): React.JSX.Element {
  return <PageSearchField {...props} />;
}
