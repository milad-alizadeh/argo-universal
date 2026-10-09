import { existsSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { resourceProcessAt } from '#mocks/acp-resource';
import { findSessionActor } from '../services/sessions';
const failedSessionId = 'opening-failed';

it('failed ACP startup retains an unstored Checkout and Feed until process cleanup is observed', async () => {
  const host = await startAcpEngine(
    {
      autoExit: false,
      newSession: () => {
        throw new Error('open refused');
      },
    },
    () => failedSessionId,
  );
  const opening = host.caller.session
    .new({
      ...emptySessionInput,
      checkout: { type: 'worktree', baseBranch: 'main' },
    })
    .catch((error: unknown): unknown => error);
  await vi.waitFor(() =>
    expect(resourceProcessAt(host.peer.processes).terminations).toBe(1),
  );
  const actor = findSessionActor(host.engine.system, failedSessionId);
  if (!actor) throw new Error('The opening Session lost its cleanup ownership');
  const checkout = actor.getSnapshot().context.checkout.path;
  expect(existsSync(checkout)).toBe(true);
  expect(host.context.findFeed(failedSessionId)?.getSnapshot().status).toBe(
    'active',
  );
  resourceProcessAt(host.peer.processes).exited.resolve();
  expect(await opening).toBeInstanceOf(Error);
  await vi.waitFor(() =>
    expect(
      findSessionActor(host.engine.system, failedSessionId),
    ).toBeUndefined(),
  );
  expect(existsSync(checkout)).toBe(false);
  expect(() => host.context.readSession(failedSessionId)).toThrow('No Session');
});
