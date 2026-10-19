import type { ReactNode } from 'react';

export type FormSurfaceProps = {
  locked: boolean;
  onShortcut: () => void;
  children: ReactNode;
};
