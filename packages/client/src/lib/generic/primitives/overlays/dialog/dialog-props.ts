import type { ReactNode } from 'react';

// Only what both the centred dialog and the narrow window's sheet honour.
export type DialogContentProps = {
  className?: string;
  // Names a dialog that has no DialogTitle of its own.
  accessibilityLabel?: string;
  // False while the content holds unsaved input: only its own actions close it.
  dismissible?: boolean;
  showClose?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
};

export interface DialogRegionProps {
  hostName?: string;
  label: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  bottomInset?: number;
}

export type DialogSheetProps = {
  label?: string;
  dismissible?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
};
