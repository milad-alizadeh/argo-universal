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

it('refuses a read outside a draw of anything but a named read', async () => {
  const { data } = harness();

  const reply = await data.handle(
    { pluginId, generation: 1 },
    {
      api: 'data',
      action: 'read',
      query: { api: 'fetch', url: 'https://example.com' },
    },
    {},
  );

  expect(reply.ok).toBe(false);
});

it('keys a named read by the Project its Query names, whatever Project the draw is for', async () => {
  const { data, answer, reads } = harness();
  const forProject = { ...overview, projectId: 'p1' };

  const drawn = data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'read', query: forProject },
    { projectId: 'other', drawn: { draw: 1 } },
  );

  await answer({ count: 1 });
  await drawn;

  const outside = await data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'read', query: forProject },
    {},
  );

  expect(valueOf(outside)).toEqual({ count: 1 });
  expect(reads()).toHaveLength(1);
});

it('drops a seed from a read a write overtook, so it never revives stale data', async () => {
  const { data, read, answer, reads } = harness();
  const other = { ...overview, args: { projectId: 'p2' } };

  const listing = read();

  await vi.waitFor(() => expect(reads()).toHaveLength(1));
  data.written(pluginId);
  await data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'seed', query: other, value: { count: 99 } },
    {},
  );
  await answer({ count: 1 });
  // The write overtook the list's read, so the Loader waits for one more.
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 1 });
  await listing;

  const after = data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'read', query: other },
    {},
  );

  await vi.waitFor(() => expect(reads()).toHaveLength(3));
  await answer({ count: 2 });

  expect(valueOf(await after)).toEqual({ count: 2 });
});

it('refuses a read or a seed of a Query that names a Project Argo has not registered, and says the fix', async () => {
  const { data, reads } = harness();
  const ghost = { ...overview, projectId: 'ghost' };

  const read = await data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'read', query: ghost },
    {},
  );

  const seed = await data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'seed', query: ghost, value: 1 },
    {},
  );

  for (const reply of [read, seed]) {
    expect(reply.ok).toBe(false);
    expect(valueOf(reply)).toContain('argo.projects.list()');
  }

  expect(reads()).toHaveLength(0);
});
