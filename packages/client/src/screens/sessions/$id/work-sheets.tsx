import type { ReactNode } from 'react';

// Both work sheets mount together and follow the focused Inspector tab.
export const bothSheets = (
  subagents: ReactNode,
  shells: ReactNode,
): ReactNode => (
  <>
    {subagents}
    {shells}
  </>
);
