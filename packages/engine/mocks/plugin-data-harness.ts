import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { vi } from 'vitest';
import { z } from 'zod';
import type { PluginClock } from '../src/plugins/clock';
import { PluginData, type DrawnFor } from '../src/plugins/data/plugin-data';
import type { PluginReply } from '../src/plugins/protocol/runtime';
import { WorkerCalls } from '../src/plugins/runtime/worker-calls';
import { StillClock } from './still-clock';

export const pluginId = 'tracker';

// Named reads run in the worker, so no Server service is asked.
const refused: PluginReply = { ok: false, error: 'No services' };

// What a test makes go wrong: reads that throw before the worker is asked, and the time a rate limit reopens.
export type Faults = { broken: boolean; limitedUntil?: number };

type ReadEvent = Extract<PluginEvent, { type: 'read' }>;

export type Harness = {
  data: PluginData;
  workers: WorkerCalls;
  reads: () => ReadEvent[];
  marks: PageAddress[][];
  answer: (value: WireJson, generation?: number) => Promise<void>;
  // The worker fails the newest named read, and the clock a test moves on.
  fail: (error: string) => Promise<void>;
  clock: StillClock;
  faults: Faults;
  read: (drawn?: Partial<DrawnFor>, fresh?: boolean) => Promise<PluginReply>;
  // A read from code outside a draw, such as a Slot's provider, of another Query than `read`.
  slotRead: () => Promise<PluginReply>;
};

export const overview = {
  api: 'read',
  name: 'overview',
  args: { projectId: 'p1' },
} as const;

const other = {
  api: 'read',
  name: 'other',
  args: { projectId: 'p1' },
} as const;

export const address: PageAddress = { pluginId, path: '/', pageState: {} };

type Wiring = {
  sent: PluginEvent[];
  marks: PageAddress[][];
  workers: WorkerCalls;
  data: PluginData;
};

const servicesOn = (
  clock: PluginClock,
  faults: Faults,
): ConstructorParameters<typeof PluginData>[0] => ({
  services: {
    handle: async (): Promise<PluginReply> => refused,
    projectIds: async (): Promise<string[]> => ['p1', 'p2'],
    limitedUntil: (): number | undefined => faults.limitedUntil,
  },
  clock,
  log: (): null => null,
  during: <T>(call: () => Promise<T>): Promise<T> =>
    faults.broken ? Promise.reject(new Error('The read broke')) : call(),
});

// A mark with no address to draw again says nothing a page could act on.
const marking =
  (marks: PageAddress[][]) =>
  (_id: string, addresses: PageAddress[]): void => {
    if (addresses.length) marks.push(addresses);
  };

function wired(clock: PluginClock, faults: Faults): Wiring {
  const sent: PluginEvent[] = [];
  const marks: PageAddress[][] = [];

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const data = new PluginData(
    servicesOn(clock, faults),
    workers,
    marking(marks),
  );

  workers.run(pluginId, 1);

  return { sent, marks, workers, data };
}

const readsOf = (sent: PluginEvent[]): ReadEvent[] =>
  sent.filter((event): event is ReadEvent => event.type === 'read');

// The worker answers the newest named read Argo asked of it.
const answering =
  ({ sent, data }: Wiring): Harness['answer'] =>
  async (value, generation = 1) => {
    const { id } = await vi.waitFor(() => newest(readsOf(sent)));

    data.reads.receive({ pluginId, generation }, { action: 'read', id, value });
  };

// The worker fails the newest named read Argo asked of it.
const failing =
  ({ sent, data }: Wiring): Harness['fail'] =>
  async (error) => {
    const { id } = await vi.waitFor(() => newest(readsOf(sent)));

    data.reads.receive(
      { pluginId, generation: 1 },
      { action: 'failed', id, error },
    );
  };

const reading =
  ({ data }: Wiring): Harness['read'] =>
  (drawn = { holder: address }, fresh = false) =>
    data.handle(
      { pluginId, generation: 1 },
      { api: 'data', action: 'read', query: overview, fresh },
      { drawn: { draw: 1, ...drawn } },
    );

const slotReading =
  ({ data }: Wiring): Harness['slotRead'] =>
  () =>
    data.handle(
      { pluginId, generation: 1 },
      { api: 'data', action: 'read', query: other, fresh: false },
      {},
    );

const actionsOn = (wiring: Wiring): Omit<Harness, 'clock' | 'faults'> => ({
  data: wiring.data,
  workers: wiring.workers,
  marks: wiring.marks,
  reads: () => readsOf(wiring.sent),
  answer: answering(wiring),
  fail: failing(wiring),
  read: reading(wiring),
  slotRead: slotReading(wiring),
});

export function harness(): Harness {
  const clock = new StillClock();
  const faults: Faults = { broken: false };

  return { ...actionsOn(wired(clock, faults)), clock, faults };
}

const Answered = z.object({ data: z.json().optional() });

// The data a read answered, or why it failed.
function newest(reads: ReadEvent[]): ReadEvent {
  const read = reads.at(-1);

  if (!read) throw new Error('No named read asked yet');

  return read;
}

export const valueOf = (reply: PluginReply): WireJson | undefined =>
  reply.ok ? Answered.parse(reply.value).data : reply.error;
