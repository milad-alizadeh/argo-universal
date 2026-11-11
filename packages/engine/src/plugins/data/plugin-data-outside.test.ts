import { expect, it, vi } from 'vitest';
import { harness, overview, valueOf } from '#mocks/plugin-data-harness';

const pluginId = 'tracker';

const outside = {
  api: 'data',
  action: 'read',
  query: overview,
} as const;

it('answers a read outside a draw from the entry a draw reads, so a Slot and a page make one named read', async () => {
  const { data, read, answer, reads } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  const reply = await data.handle({ pluginId, generation: 1 }, outside, {});

  expect(valueOf(reply)).toEqual({ count: 1 });
  expect(reads()).toHaveLength(1);
});

it('reads outside a draw for the Project it names, apart from a page that has none', async () => {
  const { data, read, answer, reads } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  const named = data.handle(
    { pluginId, generation: 1 },
    { ...outside, projectId: 'p1' },
    {},
  );

  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });

  expect(valueOf(await named)).toEqual({ count: 2 });
});

it('answers a read from a seed with no named read, until a write makes it due', async () => {
  const { data, answer, reads } = harness();

  const seeded = await data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'seed', query: overview, value: { count: 9 } },
    {},
  );

  expect(seeded.ok).toBe(true);

  const kept = await data.handle({ pluginId, generation: 1 }, outside, {});

  expect(valueOf(kept)).toEqual({ count: 9 });
  expect(reads()).toHaveLength(0);

  data.written(pluginId);

  const after = data.handle({ pluginId, generation: 1 }, outside, {});

  await vi.waitFor(() => expect(reads()).toHaveLength(1));
  await answer({ count: 10 });

  expect(valueOf(await after)).toEqual({ count: 10 });
});

it('refuses to seed a Query that is not a named read', async () => {
  const { data } = harness();

  const reply = await data.handle(
    { pluginId, generation: 1 },
    {
      api: 'data',
      action: 'seed',
      query: { api: 'fetch', url: 'https://example.com' },
      value: 1,
    },
    {},
  );

  expect(reply.ok).toBe(false);
});
