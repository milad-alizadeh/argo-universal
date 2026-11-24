import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import type { ChangesSummary } from '@repo/contracts';
import { session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { closeTestSession } from '#mocks/close-session';
import { storeSessionChanges } from './session-changes';

const prompt = [{ type: 'text' as const, text: 'Fix the build' }];

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// A worktree Session with a file of `lines` lines in its Checkout, prompted once and then closed.
async function startClosedSession(
  lines: number,
): Promise<{ host: Host; sessionId: string; worktree: string }> {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  const { sessionId } = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });

  const worktree = openings[0]?.cwd;

  if (!worktree) throw new Error('The Session did not open in a worktree');

  writeLines(worktree, 'added.txt', lines);
  await host.caller.session.prompt({ sessionId, prompt });
  await waitForAcpSessionIdle(host, sessionId);
  await closeTestSession(host, { sessionId });

  return { host, sessionId, worktree };
}

const writeLines = (worktree: string, name: string, lines: number): void =>
  writeFileSync(join(worktree, name), 'line\n'.repeat(lines));

type StoredTotals = {
  files: number | null;
  additions: number | null;
  deletions: number | null;
};

const listedChanges = async (
  host: Host,
): Promise<ChangesSummary | null | undefined> =>
  (await host.caller.session.list({ archived: false })).sessions[0]?.changes;

const storedColumns = (
  host: Host,
  sessionId: string,
): StoredTotals | undefined =>
  host.database
    .select({
      files: session.changesFiles,
      additions: session.changesAdditions,
      deletions: session.changesDeletions,
    })
    .from(session)
    .where(eq(session.id, sessionId))
    .get();

it('lists the totals the Feed read, and keeps them stored once the Session is closed', async (): Promise<void> => {
  const { host, sessionId } = await startClosedSession(3);

  await expect
    .poll(() => listedChanges(host))
    .toEqual({ files: 1, additions: 3, deletions: 0 });
  await expect
    .poll(() => storedColumns(host, sessionId))
    .toEqual({ files: 1, additions: 3, deletions: 0 });
});

it('stores the totals a read of the closed Session finds', async (): Promise<void> => {
  const { host, sessionId, worktree } = await startClosedSession(3);

  await expect
    .poll(() => listedChanges(host))
    .toEqual({ files: 1, additions: 3, deletions: 0 });

  writeLines(worktree, 'second.txt', 2);
  await host.caller.session.get({ sessionId });

  await expect
    .poll(() => listedChanges(host))
    .toEqual({ files: 2, additions: 5, deletions: 0 });
  await expect
    .poll(() => storedColumns(host, sessionId))
    .toEqual({ files: 2, additions: 5, deletions: 0 });
});

it('queues no write for totals the row already holds', async (): Promise<void> => {
  const { host, sessionId } = await startClosedSession(3);
  const sources = { database: host.database, writer: host.databaseWriter };

  await expect
    .poll(() => storedColumns(host, sessionId))
    .toEqual({ files: 1, additions: 3, deletions: 0 });

  const send = vi.spyOn(host.databaseWriter, 'send');

  storeSessionChanges(sources, sessionId, {
    files: 1,
    additions: 3,
    deletions: 0,
  });
  expect(send).not.toHaveBeenCalled();

  storeSessionChanges(sources, sessionId, {
    files: 1,
    additions: 4,
    deletions: 0,
  });
  expect(send).toHaveBeenCalledOnce();
});
