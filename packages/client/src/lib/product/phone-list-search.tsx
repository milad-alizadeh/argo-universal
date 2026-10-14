import type * as React from 'react';
import {
  ListSearchBar,
  type ListSearchBarProps,
} from '#primitives/inputs/list-search-bar/list-search-bar';
import { useWide } from '../generic/use-wide/use-wide';

// A phone list's search at its top, scrolling with it: Android draws it; iOS searches from its header and a wide window from its title row.
export function PhoneListSearch(
  props: ListSearchBarProps & { className?: string },
): React.JSX.Element | null {
  if (useWide()) return null;

  return <ListSearchBar {...props} />;
}
