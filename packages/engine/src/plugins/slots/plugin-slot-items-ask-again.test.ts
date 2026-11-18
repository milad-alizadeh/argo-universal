import {
  sessionRowSlotId,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { WorkerCalls } from '../runtime/worker-calls';
import { PluginSlotItems } from './plugin-slot-items';

const clock: PluginClock = {
  now: (): number => 0,
  delay: async (): Promise<void> => {},
  schedule: (): (() => null) => () => null,
};

const input: SlotItemsInput = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

type SlotItemsRig = { calls: PluginSlotItems; sent: PluginEvent[] };

function slotItems(): SlotItemsRig {
  const sent: PluginEvent[] = [];

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const calls = new PluginSlotItems(workers, clock, {
    writes: { dueWhenOlder: (): void => {} },
  });

  workers.run('counter', 1);

  return { calls, sent };
}

it('on a clock tick drops only what it kept for the contexts the list shows', async () => {
  const { calls, sent } = slotItems();

  const both = {
    ...input,
    contexts: [
      { sessionId: 'first', projectId: 'argo' },
      { sessionId: 'second', projectId: 'argo' },
    ],
  };

  const asked = calls.items('counter', both);

  calls.receive(
    { pluginId: 'counter', generation: 1 },
    {
      action: 'items',
      id: 0,
      items: { first: [{ text: 'one' }], second: [{ text: 'two' }] },
    },
  );
  await asked;

  calls.askAgain('counter', [input]);

  const again = calls.items('counter', both);

  expect(sent).toHaveLength(2);
  calls.receive(
    { pluginId: 'counter', generation: 1 },
    { action: 'items', id: 1, items: { first: [{ text: 'new' }] } },
  );
  expect(await again).toEqual({
    ok: true,
    items: { first: [{ text: 'new' }], second: [{ text: 'two' }] },
  });
});
