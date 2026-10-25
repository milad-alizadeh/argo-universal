import type { ReactElement } from 'react';
import type { PhoneGroupedProps } from './list-phone-props';

// Only the phones draw a native grouped list (ADR-0042), for the picker page; the web has no use for one.
export function PhoneGroupedList(_props: PhoneGroupedProps): ReactElement {
  throw new Error('A native grouped list is drawn on phones only.');
}
