import type { ReactNode } from 'react';

export interface DialogRegionProps {
  hostName?: string;
  label: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}
