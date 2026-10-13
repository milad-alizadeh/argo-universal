import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { project, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const prompt = [{ type: 'text' as const, text: 'Fix the build' }];
const worktreeInput = {
  ...emptySessionInput,
  checkout: { type: 'worktree' as const, baseBranch: 'main' },
};

it.each(agentAdapters.map(({ agent }) => agent))(
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
        pendingPlanProposal: null,
        configOptions: [],
        changes: { files: 0, additions: 0, deletions: 0 },
        epoch: 0,
        maxRevision: 0,
      },
    });
    await feed.return?.();
    expect(host.agent.processes[0]?.terminations).toBe(0);
    expect(
      await host.caller.session.close({ sessionId: created.sessionId }),
    ).toEqual({});
    expect(host.agent.processes[0]?.terminations).toBe(1);
  },
);

const startWorktreeSession = async (): Promise<{
  host: Awaited<ReturnType<typeof startAcpEngine>>;
  sessionId: string;
  worktree: string;
  readBranches: () => string;
  readRow: () => unknown;
}> => {
  const openings: NewSessionRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });
  const { sessionId } = await host.caller.session.new(worktreeInput);
  const projectPath = host.database
    .select({ path: project.path })
    .from(project)
    .where(eq(project.id, emptySessionInput.projectId))
    .get()?.path;
  const worktree = openings[0]?.cwd;
  if (!projectPath || !worktree)
    throw new Error('The worktree Session did not open in a worktree');
  return {
    host,
    sessionId,
    worktree,
    readBranches: () =>
      execFileSync(
        'git',
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
