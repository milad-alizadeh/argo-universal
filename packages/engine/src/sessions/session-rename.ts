import type { SessionRenameOutput, SessionRenameParams } from '@repo/contracts';
import { namedParam } from './named-param';
import type { OpenSessions } from './open-sessions';
import { requireWritableSession } from './session-command';
import { SessionTitleJob } from './session-storage';

type RenamingSessions = Pick<OpenSessions, 'admit' | 'queued' | 'write'>;

const shouldRename = (title: string, current: string): boolean =>
  title.length > 0 && title !== current;

const currentTitle = (sessions: RenamingSessions, sessionId: string): string =>
  requireWritableSession(sessions.queued(sessionId)).title;

// The Session to rename; a Session that runs this and names none has it filled with its own.
const renamed = (input: SessionRenameParams): string =>
  namedParam(
    input.sessionId,
    'Pass sessionId: the Session to rename. A Session that runs this and names none renames itself.',
  );

// Argo only: ACP has no request that renames a Session on the Agent's side.
export async function renameSession(
  sessions: RenamingSessions,
  input: SessionRenameParams,
): Promise<SessionRenameOutput> {
  sessions.admit();

  const sessionId = renamed(input);

  // The title as the list shows it, with queued writes, so a queued Agent title counts as current.
  const current = currentTitle(sessions, sessionId);
  const title = input.title.trim();

  if (!shouldRename(title, current)) return {};

  await sessions.write(
    new SessionTitleJob({ id: sessionId, title, titleSource: 'user' }),
  );

  return {};
}
