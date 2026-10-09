import { existsSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireResourceProcessAt } from '#mocks/acp-resource';
import { findSessionActor } from '../services/sessions';
const failedSessionId = 'opening-failed';

it('failed ACP startup retains an unstored Checkout and Feed until process cleanup is observed', async () => {
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
    const actor = findSessionActor(host.engine.system, failedSessionId);
    if (!actor)
      throw new Error('The opening Session lost its cleanup ownership');
    const checkout = actor.getSnapshot().context.checkout.path;
    expect(existsSync(checkout)).toBe(true);
    expect(host.context.findFeed(failedSessionId)?.getSnapshot().status).toBe(
      'active',
    );
    process.exited.resolve();
    expect(await openingResult).toBeInstanceOf(Error);
    await vi.waitFor(() =>
      expect(
        findSessionActor(host.engine.system, failedSessionId),
      ).toBeUndefined(),
    );
    expect(existsSync(checkout)).toBe(false);
    expect(() => host.context.readSession(failedSessionId)).toThrow(
      'No Session',
    );
  } finally {
    process.exited.resolve();
    await openingResult;
  }
});
