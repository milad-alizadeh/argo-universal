import type { SessionNewInput } from '@repo/contracts';
import { project, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle } from './acp-feed';

const prompt = [{ type: 'text' as const, text: 'Keep this Session' }];

const worktree = { type: 'worktree' as const, baseBranch: 'main' };

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

export const archiveProjectPath = (host: Host): string =>
  host.database.select().from(project).get()?.path ?? '';

export async function promptedArchiveSession(
  host: Awaited<ReturnType<typeof startAcpEngine>>,
  checkout: SessionNewInput['checkout'] = worktree,
): Promise<{ sessionId: string; path: string }> {
  const created = await host.caller.session.new({
    ...emptySessionInput,
    checkout,
  });

  await host.caller.session.prompt({ ...created, prompt });
  await waitForAcpSessionIdle(host, created.sessionId);

  return { ...created, path: archiveSessionPath(host, created.sessionId) };
}

const archiveSessionPath = (host: Host, sessionId: string): string => {
  const row = host.database
    .select()
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

  if (!row) throw new Error('Missing Session');

  return row.checkoutPath;
};

// SQLite rejects this operation until the test removes the trigger; the Writer stays real.
export function pauseArchiveWrite(
  database: Host['database'],
  predicate: 'IS NULL' | 'IS NOT NULL',
): Promise<void> {
  const rejected = Promise.withResolvers<void>();
  database.$client.function('record_archive_failure', () => {
    rejected.resolve();

    return 0;
  });
  database.$client
    .exec(`CREATE TRIGGER pause_archive BEFORE UPDATE OF archived_at ON session
    WHEN NEW.archived_at ${predicate} BEGIN
    SELECT record_archive_failure(); SELECT RAISE(ABORT, 'archive storage unavailable'); END`);

  return rejected.promise;
}
