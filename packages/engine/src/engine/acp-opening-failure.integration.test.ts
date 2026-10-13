import { existsSync } from 'node:fs';
import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { listBranches } from '@repo/git';
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

  const opening = Promise.allSettled([
    host.caller.session.new({
      ...emptySessionInput,
      checkout: { type: 'worktree', baseBranch: 'main' },
    }),
  ]);

  const checkout = (await newSessionRequested.promise).cwd;
  const process = requireScriptedProcessAt(host.agent.processes);

  try {
    await vi.waitFor(() => expect(process.terminations).toBe(1));
    expect(await listBranches(checkout)).toMatchObject({
      currentBranch: `argo/${failedSessionId}`,
    });
    expect(existsSync(checkout)).toBe(true);
    process.exited.resolve();
    expect(await opening).toMatchObject([
      { status: 'rejected', reason: expect.any(Error) },
    ]);
    expect(existsSync(checkout)).toBe(false);
    expect(
      host.database.$client
        .prepare('SELECT id FROM session WHERE id = ?')
        .get(failedSessionId),
    ).toBeUndefined();
  } finally {
    process.exited.resolve();
    await opening;
  }
});
