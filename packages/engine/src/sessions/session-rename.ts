import type { SessionRenameInput, SessionRenameOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import { writeDatabaseJobAndWaitForCommit } from '../storage';
import type { SessionRouterDeps } from './router-deps';
import { validateSessionCommandAdmission } from './session-command';
import { readWritableSession } from './session-opening';
import { createQueuedSessionReader } from './session-record';
import { SessionTitleJob } from './session-storage';

// Argo only: ACP has no request that renames a Session on the Agent's side.
export async function renameSession(
  deps: SessionRouterDeps,
  input: SessionRenameInput,
): Promise<SessionRenameOutput> {
  validateSessionCommandAdmission(deps);
  // The title as the list shows it, with queued writes, so a queued Agent title counts as current.
  const current = readWritableSession(
    createQueuedSessionReader(deps),
    input.sessionId,
  );
  const title = input.title.trim();

  if (!title || title === current.title) return {};

  const writer = deps.findWriter();

  if (!writer)
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Database Writer is not available',
    });

  await writeDatabaseJobAndWaitForCommit(
    writer,
    new SessionTitleJob({ id: input.sessionId, title, titleSource: 'user' }),
  );

  return {};
}
