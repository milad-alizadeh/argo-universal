import type { ReactNode } from 'react';
import type { DialogWindowProps } from './dialog-props';

// Web and Android draw in their portal host without another native window.
export function DialogWindow({ children }: DialogWindowProps): ReactNode {
  return children;
}
