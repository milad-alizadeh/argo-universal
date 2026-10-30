import type { SessionRenameInput, SessionRenameOutput } from '@repo/contracts';
import type { OpenSessions } from './open-sessions';
import { requireWritableSession } from './session-command';
import { SessionTitleJob } from './session-storage';

type RenamingSessions = Pick<OpenSessions, 'admit' | 'queued' | 'write'>;

const shouldRename = (title: string, current: string): boolean =>
  title.length > 0 && title !== current;

const currentTitle = (sessions: RenamingSessions, sessionId: string): string =>
  requireWritableSession(sessions.queued(sessionId)).title;

// Argo only: ACP has no request that renames a Session on the Agent's side.
export async function renameSession(
  sessions: RenamingSessions,
  input: SessionRenameInput,
): Promise<SessionRenameOutput> {
  sessions.admit();

  // The title as the list shows it, with queued writes, so a queued Agent title counts as current.
  const current = currentTitle(sessions, input.sessionId);
  const title = input.title.trim();

  if (!shouldRename(title, current)) return {};

  await sessions.write(
    new SessionTitleJob({ id: input.sessionId, title, titleSource: 'user' }),
  );

  return {};
}
