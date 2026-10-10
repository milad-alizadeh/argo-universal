import { expect, it, vi } from 'vitest';
import { waitFor } from 'xstate';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

it('Engine owns shared empty Sessions across App disconnection and waits for observed process exit', async () => {
  const host = await startAcpEngine({
    autoExit: false,
    steps: [],
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
  const process = requireScriptedProcessAt(host.agent.processes);
  expect(host.agent.processes).toHaveLength(1);
  expect(process.terminations).toBe(0);
  await host.caller.session.close({ sessionId: first.sessionId });
  expect(process.terminations).toBe(0);
  host.engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  await vi.waitFor(() => expect(process.terminations).toBe(1));
  expect(host.engine.getSnapshot().status).toBe('active');
  expect(
    host.database.$client
      .prepare('SELECT agent FROM session WHERE id = ?')
      .get(second.sessionId)?.agent,
  ).toBe('mock');
  process.exited.resolve();
  await waitFor(host.engine, (snapshot) => snapshot.status === 'done');
  expect(host.engine.getSnapshot().output).toEqual({ exitCode: 0 });
});

it('a failed Session close reports failure and Engine shutdown waits for its process exit', async () => {
  const closes: object[] = [];
  const host = await startAcpEngine({
    autoExit: false,
    steps: [],
    responses: {
      'session/close': [{ error: 'close refused', requests: closes }],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await expect(host.caller.session.close(created)).rejects.toThrow(
    'Internal error',
  );
  await expect(host.caller.session.close(created)).rejects.toThrow(
    'Internal error',
  );
  expect(closes).toHaveLength(1);
  const process = requireScriptedProcessAt(host.agent.processes);
  expect(process.terminations).toBe(1);
  host.engine.send({ type: 'engine.stop', reason: 'SIGTERM' });
  expect(host.engine.getSnapshot().status).toBe('active');
  process.exited.resolve();
  await waitFor(host.engine, (snapshot) => snapshot.status === 'done');
});
