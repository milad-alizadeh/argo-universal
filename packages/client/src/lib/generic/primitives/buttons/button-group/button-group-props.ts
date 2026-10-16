import type { ReactNode } from 'react';

export interface ButtonGroupProps {
  // Each child passes className on to its Button.
  children: ReactNode;
  className?: string;
}
