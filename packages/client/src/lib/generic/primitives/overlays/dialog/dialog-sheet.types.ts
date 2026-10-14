import type { ReactNode } from 'react';

export type DialogSheetProps = {
  label?: string;
  dismissible?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
};
