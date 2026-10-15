import type * as React from 'react';
import { StackSearch } from '#lib/product/navigation/stack-search.native';
import type { SearchedProps } from './project-list-props';
import { searchLabel } from './project-list-search';

// A phone's native header: the stack's search bar; SettingsPage sets the title.
export function PhoneHeader({
  onSearch,
}: Pick<SearchedProps, 'onSearch'>): React.JSX.Element | null {
  return <StackSearch placeholder={searchLabel} onSearch={onSearch} />;
}
