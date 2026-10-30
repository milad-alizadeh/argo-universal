import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';
import { snapshotEvent, promptInput } from './session-machine.test.mocks';

it('streams Session snapshots only when projected configuration changes', async () => {
  const host = await startAcpEngine({ steps: [{ type: 'hold' }] });
  const created = await host.caller.session.new(emptySessionInput);

  const updates = (
    await host.caller.feed.subscribe({ ...created, after: null })
  )[Symbol.asyncIterator]();

  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { state: 'idle', maxRevision: 0 },
  });
  const process = requireScriptedProcessAt(host.agent.processes);

  const option = {
    id: 'fast',
    name: 'Fast',
    type: 'boolean' as const,
    currentValue: false,
  };

  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [option],
        },
      },
    ],
    'owned-1',
  );
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { configOptions: [{ configId: 'fast', currentValue: false }] },
  });
  await process.play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [option],
        },
      },
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: [{ ...option, currentValue: true }],
        },
      },
    ],
    'owned-1',
  );
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: { configOptions: [{ configId: 'fast', currentValue: true }] },
  });
  await host.caller.session.prompt({ ...created, prompt: promptInput });
  expect((await updates.next()).value).toMatchObject({
    type: snapshotEvent,
    snapshot: {
      state: 'running',
      activeTurnId: expect.any(String),
      maxRevision: 1,
    },
  });
  await updates.return?.();
  expect(await updates.next()).toMatchObject({ done: true });
});
