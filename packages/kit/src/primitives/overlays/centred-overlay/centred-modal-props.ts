import type { ReactNode } from 'react';
import type { OpenState } from '#primitives/overlays/open-state';

export type CentredModalRootProps = OpenState & { children: ReactNode };

export type CentredModalFrameProps = {
  // The card's own classes.
  className?: string;
  accessibilityLabel?: string;
  // Names a modal whose content holds no title of its own.
  label?: string;
  // False while the content holds unsaved input: only its own actions close it.
  dismissible?: boolean;
  onCloseAutoFocus?: (event: Event) => void;
  children: ReactNode;
};

export type CentredModalTextProps = {
  className?: string;
  children?: ReactNode;
};
