import type { ReactElement } from 'react';

export interface NativeMoveMenuProps {
  // The row's move id; a row without one has no Move menu.
  id: string | undefined;
  children: ReactElement;
}

// Only iOS and Android draw a native grouped List (ADR-0042), so only their rows take a Move menu.
export function NativeMoveMenu(props: NativeMoveMenuProps): ReactElement {
  return props.children;
}
