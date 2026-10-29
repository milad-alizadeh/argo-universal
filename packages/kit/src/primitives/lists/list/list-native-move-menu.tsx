import type { ReactElement } from 'react';
import type { RowId } from './list-move-model';

export interface NativeMoveMenuProps {
  // The row's move id; a row without one has no Move menu.
  id: RowId | undefined;
  children: ReactElement;
}

// Only iOS and Android draw a native grouped List (ADR-0042), so only their rows take a Move menu.
export function NativeMoveMenu(props: NativeMoveMenuProps): ReactElement {
  return props.children;
}
