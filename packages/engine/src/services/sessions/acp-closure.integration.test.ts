import { existsSync } from 'node:fs';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { requireResourceProcessAt } from '#mocks/acp-resource';

const prompt = [{ type: 'text' as const, text: 'Start' }];

it('a Session whose close timed out keeps its Checkout and refuses work until its shared process exit is observed', async () => {
  const checkouts = new Map<string, string>();
  const host = await startAcpEngine({
    autoExit: false,
    closeTimeoutMs: 50,
    newSession: ({ params }) => {
      const sessionId = `owned-${checkouts.size + 1}`;
      checkouts.set(sessionId, params.cwd);
      return { sessionId };
    },
    closeSession: ({ params }) =>
      params.sessionId === 'owned-1' ? new Promise(() => {}) : {},
  });
  const stuck = await host.caller.session.new({
    ...emptySessionInput,
    checkout: { type: 'worktree', baseBranch: 'main' },
  });
  const sibling = await host.caller.session.new(emptySessionInput);
  await expect(host.caller.session.close(stuck)).rejects.toThrow(
    'ACP session close timed out; cleanup retained',
  );
  await host.caller.session.prompt({ ...sibling, prompt });
  await waitForAcpSessionIdle(host, sibling.sessionId);
  const process = requireResourceProcessAt(host.peer.processes);
  const retained = {
    checkout: existsSync(checkouts.get('owned-1') ?? ''),
    terminations: process.terminations,
  };
  const siblingClosing = host.caller.session.close(sibling);
  await expect.poll(() => process.terminations).toBe(1);
  await expect(
    host.caller.session.prompt({ ...stuck, prompt }),
  ).rejects.toThrow('cannot accept session.prompt');
  process.exited.resolve();
  await siblingClosing;
  await expect
    .poll(() =>
      host.caller.session.prompt({ ...stuck, prompt }).then(
        () => 'accepted',
        (error: unknown) => String(error),
      ),
    )
    .toBe('accepted');
  expect(retained).toEqual({ checkout: true, terminations: 0 });
});

it('Engine shutdown during a running Turn terminates its ACP process once and waits for its observed exit', async () => {
  const received = Promise.withResolvers<void>();
  const host = await startAcpEngine({
    autoExit: false,
    prompt: () => {
      received.resolve();
      return new Promise(() => {});
    },
  });
  const { sessionId } = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({ sessionId, prompt });
  await received.promise;
  const process = requireResourceProcessAt(host.peer.processes);
  let stopped = false;
  const stopping = host.stop().then(() => {
    stopped = true;
  });
  await expect.poll(() => process.terminations).toBe(1);
  const beforeExit = { stopped };
  process.exited.resolve();
  await stopping;
  expect({ beforeExit, terminations: process.terminations }).toEqual({
    beforeExit: { stopped: false },
    terminations: 1,
  });
});
