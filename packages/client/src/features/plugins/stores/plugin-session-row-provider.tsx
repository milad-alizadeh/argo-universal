import { SessionRowDrawingContext } from '@repo/kit/session-row-drawing';
import { type ReactNode, useMemo } from 'react';
import {
  type OpenPluginItemPage,
  useSessionListUpdates,
} from '#features/sessions';
import { drawPluginSessionRow } from './plugin-session-row';

interface ProviderProps {
  onOpenPluginPage: OpenPluginItemPage;
  children: ReactNode;
}

/*
 * Around a Plugin's tree, so a SessionRow in it draws the App's row for its Session, kept live by the list's updates;
 * a Plugin item on the row opens its page through `onOpenPluginPage`.
 */
export function PluginSessionRowProvider({
  onOpenPluginPage,
  children,
}: ProviderProps): ReactNode {
  useSessionListUpdates();

  const draw = useMemo(
    () => drawPluginSessionRow(onOpenPluginPage),
    [onOpenPluginPage],
  );

  return (
    <SessionRowDrawingContext value={draw}>{children}</SessionRowDrawingContext>
  );
}
