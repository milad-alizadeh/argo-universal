import type { SessionRenameInput, SessionRenameOutput } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import {
  writeDatabaseJobAndWaitForCommit,
  type WriterActorRef,
} from '../storage';
import type { SessionRouterDeps } from './router-deps';
import { validateSessionCommandAdmission } from './session-command';
import { readWritableSession } from './session-opening';
import { createQueuedSessionReader } from './session-record';
import { SessionTitleJob } from './session-storage';

const shouldRename = (title: string, current: string): boolean =>
  title.length > 0 && title !== current;

function requireWriter(deps: SessionRouterDeps): WriterActorRef {
  const writer = deps.findWriter();

  if (writer) return writer;
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Database Writer is not available',
  });
}

const currentTitle = (deps: SessionRouterDeps, sessionId: string): string =>
  readWritableSession(createQueuedSessionReader(deps), sessionId).title;

// Argo only: ACP has no request that renames a Session on the Agent's side.
export async function renameSession(
  deps: SessionRouterDeps,
  input: SessionRenameInput,
): Promise<SessionRenameOutput> {
  validateSessionCommandAdmission(deps);

  // The title as the list shows it, with queued writes, so a queued Agent title counts as current.
  const current = currentTitle(deps, input.sessionId);
  const title = input.title.trim();

  if (!shouldRename(title, current)) return {};

  await writeDatabaseJobAndWaitForCommit(
    requireWriter(deps),
    new SessionTitleJob({ id: input.sessionId, title, titleSource: 'user' }),
  );

  return {};
}
