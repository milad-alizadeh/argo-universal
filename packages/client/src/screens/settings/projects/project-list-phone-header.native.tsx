import type * as React from 'react';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import type { SearchedProps } from './project-list-props';
import { searchLabel } from './project-list-search';

// A phone's native header: the stack's search bar; the Settings stack sets the title.
export function PhoneHeader({
  onSearch,
}: Pick<SearchedProps, 'onSearch'>): React.JSX.Element | null {
  return <PhoneSearchBar placeholder={searchLabel} onSearch={onSearch} />;
}
