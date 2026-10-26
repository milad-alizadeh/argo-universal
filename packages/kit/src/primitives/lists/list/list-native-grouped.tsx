import type { ReactElement } from 'react';
import type { NativeGroupedProps } from './list-native-props';

// Only iOS and Android draw a native grouped list (ADR-0042), at every width; the web draws a grouped List on LegendList.
export function NativeGroupedList(_props: NativeGroupedProps): ReactElement {
  throw new Error('A native grouped list is drawn on iOS and Android only.');
}
