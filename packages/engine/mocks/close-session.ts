import type { SessionCancelOutput, SessionCloseOutput } from '@repo/contracts';
import type { Database } from '@repo/db';
import {
  OpenSessions,
  closeSession,
  createSessionReader,
  type OpenSessionsActorRef,
} from '../src/sessions';
import type { WriterActorRef } from '../src/storage';

type Host = {
  database: Database;
  openSessions: OpenSessionsActorRef;
  databaseWriter: WriterActorRef;
};

export const closeTestSession = (
  { database, openSessions, databaseWriter }: Host,
  { sessionId }: { sessionId: string },
): Promise<SessionCloseOutput> =>
  closeSession(
    new OpenSessions({
      database,
      sessions: openSessions,
      findWriter: (): WriterActorRef => databaseWriter,
      readSession: createSessionReader(database),
    }),
    sessionId,
  );

export const finishTestTurn = (
  host: Host & {
    caller: {
      session: {
        cancel: (input: { sessionId: string }) => Promise<SessionCancelOutput>;
      };
    };
  },
  command: 'cancel' | 'close',
  input: { sessionId: string },
): Promise<SessionCloseOutput> =>
  command === 'close'
    ? closeTestSession(host, input)
    : host.caller.session.cancel(input);
