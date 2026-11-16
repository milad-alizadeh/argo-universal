import { SessionRowDrawingContext } from '@repo/kit/session-row-drawing';
import type { ReactNode } from 'react';
import { PluginSessionRow } from './plugin-session-row';

// Around a Plugin's tree, so a SessionRow in it draws the App's row for its Session.
export function PluginSessionRowProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return (
    <SessionRowDrawingContext value={PluginSessionRow}>
      {children}
    </SessionRowDrawingContext>
  );
}
