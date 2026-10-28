import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { SessionChangesOutput, SessionDiffOutput } from '@repo/contracts';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { operationCaller } from '#mocks/operations';
import { startSessionJourney } from '#mocks/session-journey';

async function changedFilesHost(): Promise<
  Awaited<ReturnType<typeof startSessionJourney>> & {
    sessionId: string;
    checkout: string;
  }
> {
  const host = await startSessionJourney();
  const created = await host.caller.session.new(emptySessionInput);

  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('Missing fixture Project');
  await writeFile(join(project.path, 'first.txt'), 'first\n');
  await writeFile(join(project.path, 'second.txt'), 'second\n');

  return { ...host, ...created, checkout: project.path };
}

it('lists Sessions through the user-token Operation and the generated App query', async () => {
  const host = await startSessionJourney();
  await host.caller.session.prompt({
    sessionId: 'session-1',
    prompt: [{ type: 'text', text: 'Continue' }],
  });
  const caller = await operationCaller(host);

  const result = await caller.operations.run.mutate({
    id: 'session.list',
    params: { projectId: 'project-1' },
  });

  expect(result).toMatchObject({
    sessions: [expect.objectContaining({ sessionId: 'session-1' })],
    nextCursor: null,
  });
  expect(result).toEqual(
    await host.caller.session.list({ projectId: 'project-1' }),
  );
});

it('reads a stored Session snapshot without opening its Agent', async () => {
  const host = await startSessionJourney();
  const caller = await operationCaller(host);

  const result = await caller.operations.run.mutate({
    id: 'session.get',
    params: { sessionId: 'session-1' },
  });

  expect(result).toMatchObject({
    projectId: 'project-1',
    state: 'idle',
    activeTurnId: null,
    configOptions: [],
    checkout: { type: 'main' },
  });
  expect(result).toEqual(
    await caller.session.get.query({ sessionId: 'session-1' }),
  );
  expect(host.agent.processes).toHaveLength(0);
});

it('pages changed files through the user-token Operation while retaining comparison totals', async () => {
  const host = await changedFilesHost();
  const launches = host.agent.processes.length;
  const caller = await operationCaller(host);

  const first = SessionChangesOutput.parse(
    await caller.operations.run.mutate({
      id: 'session.changes',
      params: { sessionId: host.sessionId, limit: 1 },
    }),
  );

  expect(first).toMatchObject({
    summary: { files: 2, additions: 2, deletions: 0 },
    files: [{ path: 'first.txt' }],
    nextCursor: 1,
  });
  expect(
    await caller.operations.run.mutate({
      id: 'session.changes',
      params: {
        sessionId: host.sessionId,
        limit: 1,
        cursor: first.nextCursor,
        direction: 'forward',
      },
    }),
  ).toMatchObject({ files: [{ path: 'second.txt' }], nextCursor: null });
  expect(host.agent.processes).toHaveLength(launches);
});

it('pages a changed file diff by lines through the user-token Operation', async () => {
  const host = await changedFilesHost();
  await writeFile(join(host.checkout, 'first.txt'), 'one\ntwo\nthree\n');
  const caller = await operationCaller(host);

  const first = SessionDiffOutput.parse(
    await caller.operations.run.mutate({
      id: 'session.diff',
      params: { sessionId: host.sessionId, path: 'first.txt', limit: 2 },
    }),
  );

  expect(first).toMatchObject({
    nextCursor: 2,
    patch: { text: expect.not.stringContaining('+three') },
  });
  expect(
    await caller.operations.run.mutate({
      id: 'session.diff',
      params: {
        sessionId: host.sessionId,
        path: 'first.txt',
        cursor: first.nextCursor,
        limit: 2,
      },
    }),
  ).toMatchObject({
    nextCursor: null,
    patch: { text: expect.stringContaining('@@ -0,0 +3,1 @@') },
  });
});

it('reads a closed Session snapshot with its current Checkout totals without reopening its Agent', async () => {
  const host = await changedFilesHost();
  await host.caller.session.prompt({
    sessionId: host.sessionId,
    prompt: [{ type: 'text', text: 'Review these changes' }],
  });
  await host.caller.session.cancel({ sessionId: host.sessionId });
  await waitForAcpSessionIdle(host, host.sessionId);
  await host.caller.session.close({ sessionId: host.sessionId });
  const launches = host.agent.processes.length;
  const caller = await operationCaller(host);

  expect(
    await caller.operations.run.mutate({
      id: 'session.get',
      params: { sessionId: host.sessionId },
    }),
  ).toMatchObject({
    state: 'idle',
    changes: { files: 2, additions: 2, deletions: 0 },
  });
  expect(host.agent.processes).toHaveLength(launches);
});
