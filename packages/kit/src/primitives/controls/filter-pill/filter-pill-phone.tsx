import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';
import type { FilterPillProps } from './filter-pill-props';
import { FilterPill as WideFilterPill } from './filter-pill.tsx';

// A filter draws the web pill when the window is wide and the native control on a phone.
export function filterPillFor(
  Phone: React.ComponentType<FilterPillProps>,
): (props: FilterPillProps) => React.JSX.Element {
  return function FilterPill(props: FilterPillProps): React.JSX.Element {
    return useWide() ? <WideFilterPill {...props} /> : <Phone {...props} />;
  };
}
