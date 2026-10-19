import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

// Kit-only: a bar that stays under the header while the content scrolls, such as the Changes comparison and totals.
export type InspectorProps = KitProps<'Inspector'> & {
  toolbar?: ReactNode;
  testID?: string;
};
