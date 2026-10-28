import { execFileSync } from 'node:child_process';
import { renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

const committedFileName = 'committed.txt';

const secondFileName = 'second.txt';

async function projectPath(host: Host): Promise<string> {
  const project = (await host.caller.project.list()).find(
    ({ id }) => id === 'project-1',
  );

  if (!project) throw new Error('No Project');

  return project.path;
}

async function editTurn(): Promise<{
  host: Host;
  sessionId: string;
  checkout: string;
  releaseEdit: () => void;
  editSettled: Promise<void>;
  releaseTurn: () => void;
}> {
  const edit = Promise.withResolvers<void>();
  const editEntered = Promise.withResolvers<void>();
  const turn = Promise.withResolvers<void>();
  const turnEntered = Promise.withResolvers<void>();

  onTestFinished(() => {
    edit.resolve();
    turn.resolve();
  });

  const host = await startAcpEngine({
    steps: [
      { type: 'gate', waitFor: edit.promise, entered: editEntered },
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call',
          toolCallId: 'edit-1',
          title: 'Edit',
          kind: 'edit',
          status: 'in_progress',
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'edit-1',
          status: 'completed',
        },
      },
      { type: 'gate', waitFor: turn.promise, entered: turnEntered },
    ],
  });

  const checkout = await projectPath(host);
  const created = await host.caller.session.new(emptySessionInput);

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Edit' }],
  });
  await editEntered.promise;

  return {
    host,
    sessionId: created.sessionId,
    checkout,
    releaseEdit: () => edit.resolve(),
    editSettled: turnEntered.promise,
    releaseTurn: () => turn.resolve(),
  };
}

it('publishes default Checkout totals after a settled edit without an existing subscriber', async () => {
  const turn = await editTurn();

  writeFileSync(join(turn.checkout, 'first.txt'), 'first\n');
  turn.releaseEdit();
  await turn.editSettled;

  expect(
    (
      await waitForAcpSnapshot(
        turn.host,
        turn.sessionId,
        (snapshot) => snapshot.changes.files === 1,
      )
    ).changes,
  ).toEqual({
    files: 1,
    additions: 1,
    deletions: 0,
  });
}, 15_000);

it('refreshes default Checkout totals when a Turn ends', async () => {
  const turn = await editTurn();

  writeFileSync(join(turn.checkout, 'first.txt'), 'first\n');
  turn.releaseEdit();
  await turn.editSettled;
  await waitForAcpSnapshot(
    turn.host,
    turn.sessionId,
    (snapshot) => snapshot.changes.files === 1,
  );
  writeFileSync(join(turn.checkout, secondFileName), 'second\n');
  turn.releaseTurn();

  expect(
    (
      await waitForAcpSnapshot(
        turn.host,
        turn.sessionId,
        (snapshot) => snapshot.state === 'idle' && snapshot.changes.files === 2,
      )
    ).changes,
  ).toEqual({
    files: 2,
    additions: 2,
    deletions: 0,
  });
}, 15_000);

it('keeps the last Checkout totals when a refresh fails', async () => {
  const turn = await editTurn();

  writeFileSync(join(turn.checkout, 'first.txt'), 'first\n');
  turn.releaseEdit();
  await turn.editSettled;
  await waitForAcpSnapshot(
    turn.host,
    turn.sessionId,
    (snapshot) => snapshot.changes.files === 1,
  );
  renameSync(join(turn.checkout, '.git'), join(turn.checkout, '.git-disabled'));
  turn.releaseTurn();

  expect(
    (
      await waitForAcpSnapshot(
        turn.host,
        turn.sessionId,
        (snapshot) => snapshot.state === 'idle',
      )
    ).changes,
  ).toEqual({
    files: 1,
    additions: 1,
    deletions: 0,
  });
}, 15_000);

async function mainCheckoutSession(): Promise<{
  host: Host;
  sessionId: string;
  checkout: string;
}> {
  const host = await startAcpEngine({ steps: [] });
  const checkout = await projectPath(host);
  const created = await host.caller.session.new(emptySessionInput);

  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Inspect changes' }],
  });
  await waitForAcpSnapshot(
    host,
    created.sessionId,
    (snapshot) => snapshot.state === 'idle',
  );
  writeFileSync(join(checkout, 'first.txt'), 'first\n');

  return { host, sessionId: created.sessionId, checkout };
}

it('returns changed files on the main Checkout', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  expect(await host.caller.session.changes({ sessionId })).toEqual({
    mainBranch: 'main',
    summary: { files: 1, additions: 1, deletions: 0 },
    files: [
      { operation: 'add', path: 'first.txt', additions: 1, deletions: 0 },
    ],
    nextCursor: null,
  });
});

async function twoFileSession(): Promise<{ host: Host; sessionId: string }> {
  const session = await mainCheckoutSession();

  writeFileSync(join(session.checkout, secondFileName), 'second\n');

  return session;
}

it('pages the changed files and keeps the whole comparison in the summary', async () => {
  const { host, sessionId } = await twoFileSession();

  expect(
    await host.caller.session.changes({ sessionId, limit: 1 }),
  ).toMatchObject({
    summary: { files: 2, additions: 2, deletions: 0 },
    files: [{ path: 'first.txt' }],
    nextCursor: 1,
  });
});

// The next page is asked for as the client's infinite query asks, with its direction.
it('returns the next page of changed files from its cursor', async () => {
  const { host, sessionId } = await twoFileSession();

  expect(
    await host.caller.session.changes({
      sessionId,
      limit: 1,
      cursor: 1,
      direction: 'forward',
    }),
  ).toMatchObject({ files: [{ path: secondFileName }], nextCursor: null });
});

async function threeLineSession(): Promise<{ host: Host; sessionId: string }> {
  const session = await mainCheckoutSession();

  writeFileSync(join(session.checkout, 'first.txt'), 'one\ntwo\nthree\n');

  return session;
}

it('pages one file diff by its lines', async () => {
  const { host, sessionId } = await threeLineSession();

  expect(
    await host.caller.session.diff({ sessionId, path: 'first.txt', limit: 2 }),
  ).toMatchObject({
    nextCursor: 2,
    patch: { text: expect.not.stringContaining('+three') },
  });
});

it('numbers the next diff page from where the last one stopped', async () => {
  const { host, sessionId } = await threeLineSession();

  expect(
    await host.caller.session.diff({
      sessionId,
      path: 'first.txt',
      limit: 2,
      cursor: 2,
    }),
  ).toMatchObject({
    nextCursor: null,
    patch: { text: expect.stringContaining('@@ -0,0 +3,1 @@') },
  });
});

it('keeps Checkout totals in a stored Session snapshot after close', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  await host.caller.session.close({ sessionId });

  expect(
    (
      await waitForAcpSnapshot(
        host,
        sessionId,
        (snapshot) => snapshot.changes.files === 1,
      )
    ).changes,
  ).toEqual({ files: 1, additions: 1, deletions: 0 });
});

it('recomputes stored Checkout totals after an Engine restart', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  await host.stop();
  const restarted = await startEngineTestHost({ home: host.home });
  onTestFinished(() => restarted.stop());

  expect(
    (
      await waitForAcpSnapshot(
        restarted,
        sessionId,
        (snapshot) => snapshot.changes.files === 1,
      )
    ).changes,
  ).toEqual({ files: 1, additions: 1, deletions: 0 });
});

it('returns one changed file unified diff', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  expect(
    await host.caller.session.diff({ sessionId, path: 'first.txt' }),
  ).toMatchObject({
    file: { path: 'first.txt' },
    patch: { format: 'git_patch', text: expect.stringContaining('+first') },
  });
});

it('rejects a diff path outside the changed file list', async () => {
  const { host, sessionId } = await mainCheckoutSession();

  await expect(
    host.caller.session.diff({ sessionId, path: '../other.txt' }),
  ).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

async function committedWorktreeSession(): Promise<{
  host: Host;
  sessionId: string;
  branch: string;
}> {
  const host = await startAcpEngine({ steps: [] });
  const project = await projectPath(host);

  execFileSync('git', ['branch', '-m', 'main', 'trunk'], { cwd: project });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'feature' },
  });

  const snapshot = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.checkout.path !== '',
  );

  const branch = snapshot.checkout.branch;

  if (!branch) throw new Error('No Session branch');

  const checkout = snapshot.checkout.path;

  writeFileSync(join(checkout, committedFileName), 'from Session\n');
  execFileSync('git', ['add', committedFileName], { cwd: checkout });
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-q',
      '-m',
      'Session work',
    ],
    { cwd: checkout },
  );

  return { host, sessionId: created.sessionId, branch };
}

it.each([
  {
    comparison: undefined,
    files: [
      { operation: 'add', path: committedFileName, additions: 1, deletions: 0 },
    ],
  },
  { comparison: 'uncommitted' as const, files: [] },
  {
    comparison: { branch: 'feature' },
    files: [
      { operation: 'add', path: committedFileName, additions: 1, deletions: 0 },
    ],
  },
])(
  'returns $comparison comparison for a worktree Session',
  async ({ comparison, files }) => {
    const { host, sessionId } = await committedWorktreeSession();

    expect(
      await host.caller.session.changes({ sessionId, comparison }),
    ).toMatchObject({
      mainBranch: 'trunk',
      files,
      nextCursor: null,
    });
  },
);

it('lists Compare Against branches through the Session procedure', async () => {
  const { host, sessionId, branch } = await committedWorktreeSession();

  expect(await host.caller.session.listBranches({ sessionId })).toEqual({
    branches: [
      { name: branch, ref: `refs/heads/${branch}` },
      { name: 'feature', ref: 'refs/heads/feature' },
      { name: 'trunk', ref: 'refs/heads/trunk' },
    ],
  });
});

it('uses a linked Project Checkout branch for a Session comparison', async () => {
  const host = await startAcpEngine({ steps: [] });
  const project = await projectPath(host);
  const linked = join(project, 'linked-project');

  execFileSync(
    'git',
    ['worktree', 'add', '-q', '-b', 'linked', linked, 'feature'],
    { cwd: project },
  );
  host.database.$client
    .prepare('UPDATE project SET path = ? WHERE id = ?')
    .run(linked, 'project-1');

  const created = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'feature' },
  });

  expect(await host.caller.session.changes(created)).toEqual({
    mainBranch: 'linked',
    summary: { files: 0, additions: 0, deletions: 0 },
    files: [],
    nextCursor: null,
  });
});
