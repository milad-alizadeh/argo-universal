import type { SlotCall } from '@repo/contracts/plugins/argo-calls';
import {
  sessionBarSlotId,
  sessionRowSlotId,
  type SlotItemsInput,
} from '@repo/contracts/plugins/wire';
import { expect, it, vi } from 'vitest';
import { itemsLeftOut } from './kept-items';
import { slotItemsLimitMs } from './late-items';
import { slotItems } from './slot-items-fixture';

const input: SlotItemsInput = {
  slotId: sessionRowSlotId,
  contexts: [{ sessionId: 'first', projectId: 'argo' }],
};

const answer = (id: number, text: string): SlotCall => ({
  action: 'items',
  id,
  items: { first: [{ text }] },
});

it('keeps all Session bar lines when a Session has more than 500 attachments', async () => {
  const { calls } = slotItems();

  const items = Array.from({ length: 501 }, (_, index) => ({
    text: `#${index + 1} · Open`,
    action: { path: `/issues/${index + 1}` },
  }));

  const pending = calls.items('counter', {
    ...input,
    slotId: sessionBarSlotId,
  });

  calls.receive(
    { pluginId: 'counter', generation: 1 },
    {
      action: 'items',
      id: 0,
      items: { first: items },
    },
  );
  expect(await pending).toEqual({ ok: true, items: { first: items } });
});

it('keeps an answer for its worker generation and asks a new generation again', async () => {
  const { calls, workers, sent } = slotItems();
  const first = calls.items('counter', input);

  calls.receive({ pluginId: 'counter', generation: 1 }, answer(0, 'one'));
  expect(await first).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }] },
  });
  expect(await calls.items('counter', input)).toEqual({
    ok: true,
    items: { first: [{ text: 'one' }] },
  });
  expect(sent).toHaveLength(1);

  workers.release('counter');
  workers.run('counter', 2);
  const restarted = calls.items('counter', input);

  calls.receive({ pluginId: 'counter', generation: 2 }, answer(1, 'two'));
  expect(await restarted).toEqual({
    ok: true,
    items: { first: [{ text: 'two' }] },
  });
  expect(sent).toHaveLength(2);
});

it('leaves a Plugin out that is not running, stops mid-call or answers late', async () => {
  const { calls, workers, clock } = slotItems();

  expect(await calls.items('starting', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.notRunning,
  });

  const stopped = calls.items('counter', input);

  workers.release('counter');
  expect(await stopped).toEqual({ ok: false, reason: itemsLeftOut.notRunning });

  workers.run('counter', 2);

  const late = calls.items('counter', input);

  clock.fire();
  expect(await late).toEqual({ ok: false, reason: itemsLeftOut.late });
});

it('keeps an answer that lands after its call ran late, and asks the open lists again', async () => {
  const { calls, clock, sent } = slotItems();
  const caller = { pluginId: 'counter', generation: 1 };
  const first = calls.items('counter', input);

  calls.receive(caller, answer(0, 'before'));
  await first;
  calls.changed('counter');

  const late = calls.items('counter', input);

  clock.fire(slotItemsLimitMs);
  expect(await late).toEqual({
    ok: true,
    items: { first: [{ text: 'before' }] },
    standingInFor: itemsLeftOut.late,
  });

  const before = calls.changes.version;

  calls.receive(caller, answer(1, 'after'));
  await vi.waitFor(() => expect(calls.changes.version).toBeGreaterThan(before));
  expect(await calls.items('counter', input)).toEqual({
    ok: true,
    items: { first: [{ text: 'after' }] },
  });
  expect(sent).toHaveLength(2);
});

it('drops a late answer that lands after a change signal', async () => {
  const { calls, clock, sent } = slotItems();
  const caller = { pluginId: 'counter', generation: 1 };
  const late = calls.items('counter', input);

  clock.fire(slotItemsLimitMs);
  await late;
  calls.changed('counter');
  calls.receive(caller, answer(0, 'old'));

  const again = calls.items('counter', input);

  expect(sent).toHaveLength(2);
  calls.receive(caller, answer(1, 'new'));
  expect(await again).toEqual({
    ok: true,
    items: { first: [{ text: 'new' }] },
  });
});

it('drops what a Plugin answered before its change signal', async () => {
  const { calls, sent } = slotItems();
  const before = calls.changes.version;
  const asked = calls.items('counter', input);

  calls.changed('counter');
  calls.receive({ pluginId: 'counter', generation: 1 }, answer(0, 'old'));
  await asked;
  expect(calls.changes.version).toBeGreaterThan(before);

  void calls.items('counter', input);
  expect(sent).toHaveLength(2);
});

it('asks a failing Plugin again only after its change signal', async () => {
  const { calls, sent } = slotItems();
  const caller = { pluginId: 'counter', generation: 1 };
  const asked = calls.items('counter', input);

  calls.receive(caller, { action: 'failed', id: 0, error: 'broken' });

  expect(await asked).toEqual({ ok: false, reason: itemsLeftOut.threw });
  expect(await calls.items('counter', input)).toEqual({
    ok: false,
    reason: itemsLeftOut.threw,
  });
  expect(sent).toHaveLength(1);

  calls.changed('counter');
  void calls.items('counter', input);
  expect(sent).toHaveLength(2);
});
