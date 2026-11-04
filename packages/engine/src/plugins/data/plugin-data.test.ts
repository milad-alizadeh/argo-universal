import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { PluginClock } from '../clock';
import type { PluginReply } from '../protocol/runtime';
import { WorkerCalls } from '../runtime/worker-calls';
import { PluginData, type DrawnFor } from './plugin-data';

const pluginId = 'tracker';

// Named reads run in the worker, so no Server service is asked.
const refused: PluginReply = { ok: false, error: 'No services' };

const clock: PluginClock = {
  now: () => 0,
  delay: async () => {},
  schedule: () => () => null,
};

type ReadEvent = Extract<PluginEvent, { type: 'read' }>;

type Harness = {
  data: PluginData;
  workers: WorkerCalls;
  reads: () => ReadEvent[];
  marks: PageAddress[][];
  answer: (value: WireJson, generation?: number) => Promise<void>;
  read: (drawn?: Partial<DrawnFor>, fresh?: boolean) => Promise<PluginReply>;
};

const overview = {
  api: 'read',
  name: 'overview',
  args: { projectId: 'p1' },
} as const;

const address: PageAddress = { pluginId, path: '/', pageState: {} };

function harness(): Harness {
  const sent: PluginEvent[] = [];
  const marks: PageAddress[][] = [];

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const data = new PluginData(
    {
      services: { handle: async (): Promise<PluginReply> => refused },
      clock,
      send: (): null => null,
      log: (): null => null,
      during: <T>(call: () => Promise<T>): Promise<T> => call(),
    },
    workers,
    (_pluginId, addresses) => marks.push(addresses),
  );

  workers.run(pluginId, 1);

  const reads = (): ReadEvent[] =>
    sent.filter((event): event is ReadEvent => event.type === 'read');

  // The worker answers the newest named read Argo asked of it.
  const answer = async (value: WireJson, generation = 1): Promise<void> => {
    const { id } = await vi.waitFor(() => newest(reads()));

    data.reads.receive({ pluginId, generation }, { action: 'read', id, value });
  };

  const read = (
    drawn: Partial<DrawnFor> = { holder: address },
    fresh = false,
  ): Promise<PluginReply> =>
    data.handle(
      { pluginId, generation: 1 },
      { api: 'data', action: 'read', draw: 1, query: overview, fresh },
      { drawn: { draw: 1, ...drawn } },
    );

  return { data, workers, reads, marks, answer, read };
}

const Answered = z.object({ data: z.json().optional() });

// The data a read answered, or why it failed.
function newest(reads: ReadEvent[]): ReadEvent {
  const read = reads.at(-1);

  if (!read) throw new Error('No named read asked yet');

  return read;
}

const valueOf = (reply: PluginReply): WireJson | undefined =>
  reply.ok ? Answered.parse(reply.value).data : reply.error;

it('runs one named read for every Loader reading the Query while it is in flight', async () => {
  const { read, answer, reads } = harness();

  const first = read();
  const second = read();

  await answer({ count: 1 });

  expect(valueOf(await first)).toEqual({ count: 1 });
  expect(valueOf(await second)).toEqual({ count: 1 });
  expect(reads()).toHaveLength(1);
});

it('keeps the answer for a draw until a write makes it due', async () => {
  const { data, read, answer, reads } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  expect(valueOf(await read())).toEqual({ count: 1 });
  expect(reads()).toHaveLength(1);

  data.written(pluginId);
  const after = read();
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });

  expect(valueOf(await after)).toEqual({ count: 2 });
});

it('reads again when a write lands while the read is in flight', async () => {
  const { data, read, answer, reads } = harness();

  const drawn = read();
  await vi.waitFor(() => expect(reads()).toHaveLength(1));
  data.written(pluginId);
  await answer({ count: 1 });
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 2 });

  expect(valueOf(await drawn)).toEqual({ count: 2 });
});

it('marks the addresses that drew an answer once it changes, and none when it does not', async () => {
  const { read, answer, marks } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  // A background pass reads fresh and holds nothing; it is what finds the answer changed.
  const same = read({ holder: undefined });
  await answer({ count: 1 });
  await same;
  expect(marks).toEqual([]);

  const changed = read({ holder: undefined });
  await answer({ count: 2 });
  await changed;
  expect(marks).toEqual([[address]]);
});

it('forgets the named reads of a worker generation that ended', async () => {
  const { workers, read, answer, reads } = harness();

  const first = read();
  await answer({ count: 1 });
  await first;

  workers.run(pluginId, 2);

  const after = read();
  await vi.waitFor(() => expect(reads()).toHaveLength(2));
  await answer({ count: 3 }, 2);

  expect(valueOf(await after)).toEqual({ count: 3 });
});

it('refuses a Loader read outside a draw', async () => {
  const { data } = harness();

  const reply = await data.handle(
    { pluginId, generation: 1 },
    { api: 'data', action: 'read', draw: 1, query: overview },
    {},
  );

  expect(reply.ok).toBe(false);
});
