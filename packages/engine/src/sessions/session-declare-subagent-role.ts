import type {
  SessionDeclareSubagentRoleInput,
  SessionDeclareSubagentRoleOutput,
} from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { OpenSessions } from './open-sessions';
import { sendSessionCommand } from './session-command';

const missingSession = (): TRPCError =>
  new TRPCError({
    code: 'BAD_REQUEST',
    message:
      'session.declareSubagentRole names the Session that spawns the Agent: pass sessionId. A Session that runs it needs no sessionId.',
  });

// Argo only: the role waits in the live Session for the next Agent it spawns (#2075).
export async function declareSubagentRole(
  sessions: Pick<OpenSessions, 'admit' | 'live'>,
  { sessionId, role }: SessionDeclareSubagentRoleInput,
): Promise<SessionDeclareSubagentRoleOutput> {
  if (sessionId === undefined) throw missingSession();
  sessions.admit();
  sendSessionCommand(sessions.live(sessionId), {
    type: 'session.declareSubagentRole',
    role,
  });

  return {};
}
