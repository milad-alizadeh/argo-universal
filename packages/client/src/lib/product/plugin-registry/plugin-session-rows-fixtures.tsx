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

type NodeOf = Pick<WireNode, 'type' | 'key' | 'props'> &
  Partial<Pick<WireNode, 'children'>>;

const node = ({ children = [], ...rest }: NodeOf): WireNode => ({
  ...rest,
  children,
  slots: {},
});

const sessions = [runningSession, idleSession];

const sessionRowNode = (sessionId: string): WireNode =>
  node({ type: 'SessionRow', key: sessionId, props: { sessionId } });

// The Issue page's attached Sessions: each row is one SessionRow naming a Session.
export const attachedSessionsTree = node({
  type: 'List',
  key: 'list',
  props: { appearance: 'grouped' },
  children: [
    node({
      type: 'List.Section',
      key: 'sessions',
      props: { title: 'Sessions' },
      children: sessions.map(({ session }) =>
        sessionRowNode(session.sessionId),
      ),
    }),
  ],
});

const ignore = (): void => undefined;

// Stands in for the App's connected row with fixture Sessions, since a story reads no data.
function FixtureSessionRow({
  sessionId,
}: SessionRowDrawingProps): React.JSX.Element | null {
  const fixture = sessions.find(
    ({ session }) => session.sessionId === sessionId,
  );

  return fixture ? <SessionRow {...fixture} onSelect={ignore} /> : null;
}

const drawFixtureRow = (props: SessionRowDrawingProps): React.JSX.Element => (
  <FixtureSessionRow {...props} />
);

export function WithSessionRows({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <SessionRowDrawingContext value={drawFixtureRow}>
      {children}
    </SessionRowDrawingContext>
  );
}
