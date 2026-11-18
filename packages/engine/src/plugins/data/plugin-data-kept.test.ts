import { expect, it, vi } from 'vitest';
import {
  harness,
  overview,
  pluginId,
  valueOf,
} from '#mocks/plugin-data-harness';

const caller = { pluginId, generation: 1 };

const outside = { api: 'data', action: 'read', query: overview } as const;

const forSlot = { slot: true } as const;

// A Slot's read of an entry a write made due, with its kept answer still { count: 1 }.
async function dueAfterAnswer(): Promise<ReturnType<typeof harness>> {
  const loaded = harness();
  const first = loaded.read();

  await loaded.answer({ count: 1 });
  await first;
  loaded.data.written(pluginId);

  return loaded;
}

it("answers a Slot's read of a due entry with the kept answer while it reads again", async () => {
  const { data, reads } = await dueAfterAnswer();

  const kept = await data.handle(caller, outside, forSlot);

  expect(valueOf(kept)).toEqual({ count: 1 });
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
});

it('announces the fresh answer of a Slot-read entry when it differs from the kept one', async () => {
  const { data, answer, reads, announced } = await dueAfterAnswer();

  await data.handle(caller, outside, forSlot);

  const before = announced();

  await answer({ count: 2 });

  await vi.waitFor(() => expect(announced()).toBeGreaterThan(before));
  expect(valueOf(await data.handle(caller, outside, forSlot))).toEqual({
    count: 2,
  });
  expect(reads()).toHaveLength(2);
});

it("announces the failure of the read behind a Slot's kept answer, so the Slot asks again and sees it", async () => {
  const { data, fail, announced } = await dueAfterAnswer();

  await data.handle(caller, outside, forSlot);

  const before = announced();

  await fail('GitHub is down');

  await vi.waitFor(() => expect(announced()).toBeGreaterThan(before));
});

it("announces a read that breaks behind a Slot's kept answer", async () => {
  const { data, faults, announced } = await dueAfterAnswer();
  const before = announced();

  faults.broken = true;
  await data.handle(caller, outside, forSlot);

  await vi.waitFor(() => expect(announced()).toBeGreaterThan(before));
});

it('makes any other read outside a draw wait for the fresh answer of a due entry', async () => {
  const { data, read, answer, reads } = harness();
  const first = read();

  await answer({ count: 1 });
  await first;
  data.written(pluginId);

  const asked = data.handle(caller, outside, {});

  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });

  expect(valueOf(await asked)).toEqual({ count: 2 });
});

it("makes a Slot's read wait for the first answer when the entry holds none", async () => {
  const { data, answer, reads } = harness();
  const asked = data.handle(caller, outside, forSlot);

  await vi.waitFor(() => expect(reads()).toHaveLength(1));
  await answer({ count: 1 });

  expect(valueOf(await asked)).toEqual({ count: 1 });
});
