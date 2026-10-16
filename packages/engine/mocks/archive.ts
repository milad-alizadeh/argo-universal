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

  const row = host.database
    .select()
    .from(session)
    .where(eq(session.id, created.sessionId))
    .get();

  if (!row) throw new Error('Missing Session');

  return { ...created, path: row.checkoutPath };
}
