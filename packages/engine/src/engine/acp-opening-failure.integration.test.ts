import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireResourceProcessAt } from '#mocks/acp-resource';
const failedSessionId = 'opening-failed';

it('failed ACP startup retains its unstored Checkout until process cleanup is observed', async () => {
  const newSessionRequested = Promise.withResolvers<void>();
  const host = await startAcpEngine(
    {
      autoExit: false,
      newSession: () => {
        newSessionRequested.resolve();
        throw new Error('open refused');
      },
    },
    () => failedSessionId,
  );
  const openingResult = host.caller.session
    .new({
      ...emptySessionInput,
      checkout: { type: 'worktree', baseBranch: 'main' },
    })
    .catch((error: unknown): unknown => error);
  await newSessionRequested.promise;
  const process = requireResourceProcessAt(host.peer.processes);
  try {
    await vi.waitFor(() => expect(process.terminations).toBe(1));
    const worktrees = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: process.launch.cwd,
      encoding: 'utf8',
    });
    const checkout = worktrees
      .split('\n\n')
      .find((entry) =>
        entry.split('\n').includes(`branch refs/heads/argo/${failedSessionId}`),
      )
      ?.split('\n')[0]
      ?.slice('worktree '.length);
    if (!checkout) throw new Error('The failed Session Checkout is missing');
    expect(existsSync(checkout)).toBe(true);
    process.exited.resolve();
    expect(await openingResult).toBeInstanceOf(Error);
    expect(existsSync(checkout)).toBe(false);
    expect(
      host.database.$client
        .prepare('SELECT id FROM session WHERE id = ?')
        .get(failedSessionId),
    ).toBeUndefined();
  } finally {
    process.exited.resolve();
    await openingResult;
  }
});
