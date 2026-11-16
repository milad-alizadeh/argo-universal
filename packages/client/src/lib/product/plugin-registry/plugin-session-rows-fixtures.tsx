import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  SessionRowDrawingContext,
  type SessionRowDrawingProps,
} from '@repo/kit/session-row-drawing';
import type * as React from 'react';
import { SessionRow } from '../../../features/sessions/components/session-row/session-row';
import {
  idleSession,
  runningSession,
} from '../../../features/sessions/components/session-row/session-row-fixtures';

const node = (
  type: string,
  key: string,
  props: WireNode['props'],
  children: WireNode[] = [],
): WireNode => ({ type, key, props, children, slots: {} });

// The Issue page's attached Sessions: each row is one SessionRow naming a Session.
export const attachedSessionsTree = node(
  'List',
  'list',
  { appearance: 'grouped' },
  [
    node('List.Section', 'sessions', { title: 'Sessions' }, [
      node('SessionRow', runningSession.session.sessionId, {
        sessionId: runningSession.session.sessionId,
      }),
      node('SessionRow', idleSession.session.sessionId, {
        sessionId: idleSession.session.sessionId,
      }),
    ]),
  ],
);

const sessions = [runningSession, idleSession];

// Stands in for the App's connected row with fixture Sessions, since a story reads no data.
function FixtureSessionRow({
  sessionId,
}: SessionRowDrawingProps): React.JSX.Element | null {
  const fixture = sessions.find(
    ({ session }) => session.sessionId === sessionId,
  );

  return fixture ? (
    <SessionRow {...fixture} onSelect={() => undefined} />
  ) : null;
}

export function WithSessionRows({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SessionRowDrawingContext value={FixtureSessionRow}>
      {children}
    </SessionRowDrawingContext>
  );
}
