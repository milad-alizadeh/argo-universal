import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionBarSlotId,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { itemsLeftOut } from './kept-items';
import { slotItemsLimitMs } from './late-items';
import { slotItems } from './slot-items-fixture';

const first = { sessionId: 'first', projectId: 'argo' };

const second = { sessionId: 'second', projectId: 'argo' };

const bar: SlotItemsInput = { slotId: sessionBarSlotId, contexts: [first] };

const caller = { pluginId: 'counter', generation: 1 };

const answer = (id: number, text: string): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text }] },
});

// Lets a late call's reply reach the worker's kept items.
const settled = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

it('leaves a Plugin out as failed when its late call throws', async () => {
  const { calls, clock, sent } = slotItems();
  const asked = calls.items('counter', bar);

  clock.fire(slotItemsLimitMs);
  await asked;
  calls.receive(caller, { action: 'failed', id: 0, error: 'broken' });
  await settled();

  expect(await calls.items('counter', bar)).toEqual({
    ok: false,
    reason: itemsLeftOut.threw,
  });
  expect(sent).toHaveLength(1);
});

it('answers contexts already kept while a late call for another is out', async () => {
  const { calls, clock } = slotItems();
  const kept = calls.items('counter', bar);

  calls.receive(caller, answer(0, 'Open'));
  await kept;

  const both = calls.items('counter', { ...bar, contexts: [first, second] });

  clock.fire(slotItemsLimitMs);
  expect(await both).toMatchObject({ standingInFor: itemsLeftOut.late });
  expect(await calls.items('counter', bar)).toEqual({
    ok: true,
    items: { first: [{ text: 'Open' }] },
  });
});
