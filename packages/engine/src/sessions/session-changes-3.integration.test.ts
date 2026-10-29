import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveExecutable } from '@repo/executables';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { projectPath } from './session-changes-project.test.mocks';
import {
  committedFileName,
  committedWorktreeSession,
} from './session-changes.test.mocks';

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
    resolveExecutable('git'),
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
