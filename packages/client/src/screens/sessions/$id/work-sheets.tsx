import type { ReactNode } from 'react';
import type { WorkPresentation } from './session-work-sheet';

// Both work sheets mount together; each draws only at its own width and when its panel is shown.
export const bothSheets = (
  subagents: WorkPresentation,
  shells: WorkPresentation,
): ReactNode => (
  <>
    {subagents.sheet}
    {shells.sheet}
  </>
);
