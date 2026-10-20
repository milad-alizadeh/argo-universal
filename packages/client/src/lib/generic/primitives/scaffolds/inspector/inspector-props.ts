import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

// Kit-only: a bar that stays under the header while the content scrolls, such as the Changes comparison and totals.
export type InspectorProps = KitProps<'Inspector'> & {
  // A phone Inspector can own its header, such as the Git sheet's PR / File changes switcher.
  sheetHeader?: ReactNode;
  toolbar?: ReactNode;
  testID?: string;
};
