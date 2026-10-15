import type * as React from 'react';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SearchedProps } from './project-list-props';
import { searchLabel } from './project-list-search';

// A narrow web window's header row: the title and Search.
export function PhoneHeader({
  onSearch,
}: Pick<SearchedProps, 'onSearch'>): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <ScreenHeader
      title="Projects"
      search={{ placeholder: searchLabel, onChangeText: onSearch }}
    />
  );
}
