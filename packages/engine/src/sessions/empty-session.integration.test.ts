import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { session } from '@repo/db/schema';
import { resolveExecutable } from '@repo/executables';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { projectPathFor } from './empty-session.test.mocks';

type AcpEngine = Awaited<ReturnType<typeof startAcpEngine>>;

const openingWorktree = (openings: NewSessionRequest[]): string | undefined =>
  openings[0]?.cwd;

const prompt = [{ type: 'text' as const, text: 'Fix the build' }];

const worktreeInput = {
  ...emptySessionInput,
  checkout: { type: 'worktree' as const, baseBranch: 'main' },
};

it.each(fixtureAgents.map(({ agent }) => agent))(
  'the public empty %s Session becomes readable without a Turn and awaits closure',
  async (agent) => {
    const host = await startAcpEngine({ steps: [] }, undefined, agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    const feed = (
      await host.caller.feed.subscribe({
        sessionId: created.sessionId,
        after: null,
      })
    )[Symbol.asyncIterator]();

    const first = await feed.next();
    expect(first.value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        agent,
        state: 'idle',
        activeTurnId: null,
        usage: null,
        pendingPermission: null,
        pendingElicitation: null,
        configOptions: [],
        changes: { files: 0, additions: 0, deletions: 0 },
        epoch: 0,
        maxRevision: 0,
      },
    });
    await feed.return?.();
    const process = requireScriptedProcessAt(host.agent.processes);
    expect(process.terminations).toBe(0);
    expect(
      await host.caller.session.close({ sessionId: created.sessionId }),
    ).toEqual({});
    expect(process.terminations).toBe(1);
  },
);

const startWorktreeSession = async (): Promise<{
  host: AcpEngine;
  sessionId: string;
  worktree: string;
  readBranches: () => string;
  readRow: () => Pick<typeof session.$inferSelect, 'id'> | undefined;
}> => {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  const { sessionId } = await host.caller.session.new(worktreeInput);

  const projectPath = projectPathFor(host);
  const worktree = openingWorktree(openings);

  if (!projectPath || !worktree)
    throw new Error('The worktree Session did not open in a worktree');

  return {
    host,
    sessionId,
    worktree,
    readBranches: () =>
      execFileSync(
        resolveExecutable('git'),
        [
          '-C',
          projectPath,
          'branch',
          '--list',
          '--format=%(refname:short)',
          'argo/*',
        ],
        { encoding: 'utf8' },
      ).trim(),
    readRow: () =>
      host.database
        .select({ id: session.id })
        .from(session)
        .where(eq(session.id, sessionId))
        .get(),
  };
};

it('closing a Session no prompt reached deletes its row, worktree and argo branch', async () => {
  const { host, sessionId, worktree, readBranches, readRow } =
    await startWorktreeSession();

  const opened = { worktree: existsSync(worktree), branches: readBranches() };

  await host.caller.session.close({ sessionId });

  expect({
    opened,
    worktree: existsSync(worktree),
    branches: readBranches(),
    row: readRow(),
  }).toEqual({
    opened: { worktree: true, branches: `argo/${sessionId}` },
    worktree: false,
    branches: '',
    row: undefined,
  });
});

it('closing a prompted Session keeps its row, worktree and argo branch', async () => {
  const { host, sessionId, worktree, readBranches, readRow } =
    await startWorktreeSession();

  await host.caller.session.prompt({ sessionId, prompt });
  await waitForAcpSessionIdle(host, sessionId);

  await host.caller.session.close({ sessionId });

  expect({
    worktree: existsSync(worktree),
    branches: readBranches(),
    row: readRow(),
  }).toEqual({
    worktree: true,
    branches: `argo/${sessionId}`,
    row: { id: sessionId },
  });
});

it('lists an empty Session only after its first Turn, titled from the first prompt', async () => {
  const host = await startAcpEngine();
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  const before = await host.caller.session.list({ archived: false });

  await host.caller.session.prompt({ sessionId, prompt });
  await waitForAcpSessionIdle(host, sessionId);

  const after = await host.caller.session.list({ archived: false });
  expect({
    before: before.sessions,
    after: after.sessions.map(({ sessionId, title }) => ({ sessionId, title })),
  }).toEqual({ before: [], after: [{ sessionId, title: 'Fix the build' }] });
});
