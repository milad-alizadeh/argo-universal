import type { SessionArchiveOutput } from '@repo/contracts';
import { hasUncommittedFiles } from '@repo/git';
import { TRPCError } from '@trpc/server';
import { archiveSession, requireArchivable } from './archive-commands';

type PluginArchiveSources = Parameters<typeof archiveSession>[0];

// Archiving removes a worktree, so only a Session on its own worktree can lose files; one on another Checkout keeps them.
async function requireNothingUncommitted(
  sources: PluginArchiveSources,
  sessionId: string,
): Promise<void> {
  const { checkout } = sources.readSession(sessionId);

  if (
    checkout.type === 'worktree' &&
    (await hasUncommittedFiles(checkout.path))
  )
    throw new TRPCError({
      code: 'CONFLICT',
      message: `Session ${sessionId} has uncommitted files in its Checkout; commit or discard them before archiving`,
    });
}

/*
 * A Plugin's archive, refused beside the Turn that runs while the Checkout has uncommitted files, so no Plugin can
 * lose a person's unsaved work (ADR-0055). One `git status` per call; the App's own archive does not ask. A Session
 * already archived, such as one the person archived first, is done: a refusal would have the Plugin ask again on
 * every Watch (#2470).
 */
export async function archiveSessionFromPlugin(
  sources: PluginArchiveSources,
  sessionId: string,
): Promise<SessionArchiveOutput> {
  if (sources.readSession(sessionId).archivedAt !== null) return {};

  requireArchivable(sources, sessionId);
  await requireNothingUncommitted(sources, sessionId);

  return archiveSession(sources, sessionId);
}
