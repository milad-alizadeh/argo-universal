import { expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireResourceProcessAt } from '#mocks/acp-resource';
import { findSessionActor } from '../services/sessions';

it('Engine owns shared empty Sessions across App disconnection and waits for observed process exit', async () => {
  let identity = 0;
  const host = await startAcpEngine({
    autoExit: false,
    newSession: () => ({ sessionId: String(++identity) }),
  });
  const first = await host.caller.session.new(emptySessionInput);
  const second = await host.caller.session.new(emptySessionInput);
  const feed = (
    await host.caller.feed.subscribe({
      sessionId: first.sessionId,
      after: null,
    })
  )[Symbol.asyncIterator]();
  expect((await feed.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: { state: 'idle', activeTurnId: null },
  });
  await feed.return?.();
  const process = requireResourceProcessAt(host.peer.processes);
  expect(host.peer.processes).toHaveLength(1);
  expect(process.terminations).toBe(0);
  await host.caller.session.close({ sessionId: first.sessionId });
  expect(process.terminations).toBe(0);
  host.engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  expect(host.engine.getSnapshot().status).toBe('active');
  expect(host.context.readSession(second.sessionId).agent).toBe('mock');
  expect(host.context.findWriter()?.getSnapshot().status).toBe('active');
  process.exited.resolve();
  await waitFor(host.engine, (snapshot) => snapshot.status === 'done');
  expect(host.engine.getSnapshot().output).toEqual({ exitCode: 0 });
});

it('a failed Session close reports failure while retaining Feed until its process exits', async () => {
  let closes = 0;
  const host = await startAcpEngine({
    autoExit: false,
    closeSession: () => {
      closes += 1;
      throw new Error('close refused');
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await expect(host.caller.session.close(created)).rejects.toThrow(
    'Internal error',
  );
  const actor = findSessionActor(host.engine.system, created.sessionId);
  expect(
    actor?.getSnapshot().matches({ open: { acp: 'retainingCleanup' } }),
  ).toBe(true);
  expect(host.context.findFeed(created.sessionId)?.getSnapshot().status).toBe(
    'active',
  );
  await expect(host.caller.session.close(created)).rejects.toThrow(
    'Internal error',
  );
  expect(closes).toBe(1);
  const process = requireResourceProcessAt(host.peer.processes);
  expect(process.terminations).toBe(1);
  process.exited.resolve();
  await vi.waitFor(() =>
    expect(
      findSessionActor(host.engine.system, created.sessionId),
    ).toBeUndefined(),
  );
  expect(host.context.readSession(created.sessionId).agent).toBe('mock');
});
