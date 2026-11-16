import { SessionRowDrawingContext } from '@repo/kit/session-row-drawing';
import type { ReactNode } from 'react';
import { useSessionListUpdates } from '../sessions/use-session-list-updates';
import { PluginSessionRow } from './plugin-session-row';

// Around a Plugin's tree, so a SessionRow in it draws the App's row for its Session, kept live by the list's updates.
export function PluginSessionRowProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  useSessionListUpdates();

  return (
    <SessionRowDrawingContext value={PluginSessionRow}>
      {children}
    </SessionRowDrawingContext>
  );
}
