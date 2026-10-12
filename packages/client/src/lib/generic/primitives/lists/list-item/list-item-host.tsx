import type { ReactNode } from 'react';

// The web draws a row in React Native, so it needs no native Host.
export function ListItemHost({ children }: { children: ReactNode }): ReactNode {
  return children;
}
