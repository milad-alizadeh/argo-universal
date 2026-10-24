import type { ReactElement } from 'react';
import type { ListProps } from './list-props';

// Only the phones draw `grouped` natively (ADR-0042); the web draws it on LegendList (list-grouped-cell.tsx).
export const phoneGrouped = false;

export function PhoneGroupedList<Item>(_props: ListProps<Item>): ReactElement {
  throw new Error('A grouped List is drawn natively on phones only.');
}
