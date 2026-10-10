import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
const failedSessionId = 'opening-failed';

it('failed ACP startup retains its unstored Checkout until process cleanup is observed', async () => {
  const newSessionRequested = Promise.withResolvers<NewSessionRequest>();
  const host = await startAcpEngine(
    {
      autoExit: false,
      steps: [],
      responses: {
        'session/new': [
          { received: newSessionRequested, error: 'open refused' },
        ],
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
  const process = requireScriptedProcessAt(host.agent.processes);
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
