import type { ReactNode } from 'react';

// A phone's popover is a Sheet whose rows stay grouped; the platform moves focus between them.
export function ListMenuRows({ children }: { children: ReactNode }): ReactNode {
  return children;
}
