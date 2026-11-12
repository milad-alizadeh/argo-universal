import type { PluginProjectInfo } from '@repo/contracts/plugins';
import type { PageAddress } from '@repo/contracts/plugins/page-address';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { vi } from 'vitest';
import { z } from 'zod';
import type { PluginClock } from '../src/plugins/clock';
import { PluginData, type DrawnFor } from '../src/plugins/data/plugin-data';
import type { PluginReply } from '../src/plugins/protocol/runtime';
import { WorkerCalls } from '../src/plugins/runtime/worker-calls';

export const pluginId = 'tracker';

// Named reads run in the worker, so no Server service is asked.
const refused: PluginReply = { ok: false, error: 'No services' };

const clock: PluginClock = {
  now: () => 0,
  delay: async () => {},
  schedule: () => () => null,
};

type ReadEvent = Extract<PluginEvent, { type: 'read' }>;

export type Harness = {
  data: PluginData;
  workers: WorkerCalls;
  reads: () => ReadEvent[];
  marks: PageAddress[][];
  answer: (value: WireJson, generation?: number) => Promise<void>;
  read: (drawn?: Partial<DrawnFor>, fresh?: boolean) => Promise<PluginReply>;
};

export const overview = {
  api: 'read',
  name: 'overview',
  args: { projectId: 'p1' },
} as const;

export const address: PageAddress = { pluginId, path: '/', pageState: {} };

type Wiring = {
  sent: PluginEvent[];
  marks: PageAddress[][];
  workers: WorkerCalls;
  data: PluginData;
};

const services = {
  services: {
    handle: async (): Promise<PluginReply> => refused,
    projectInfo: async (): Promise<PluginProjectInfo[]> =>
      ['p1', 'p2'].map((id) => ({ id, name: id, originUrl: null })),
  },
  clock,
  log: (): null => null,
  during: <T>(call: () => Promise<T>): Promise<T> => call(),
};

function wired(): Wiring {
  const sent: PluginEvent[] = [];
  const marks: PageAddress[][] = [];

  const workers = new WorkerCalls({
    clock,
    send: (_pluginId, event): void => void sent.push(event),
  });

  const data = new PluginData(services, workers, (_id, addresses) =>
    marks.push(addresses),
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

const reading =
  ({ data }: Wiring): Harness['read'] =>
  (drawn = { holder: address }, fresh = false) =>
    data.handle(
      { pluginId, generation: 1 },
      { api: 'data', action: 'read', query: overview, fresh },
      { drawn: { draw: 1, ...drawn } },
    );

export function harness(): Harness {
  const wiring = wired();
  const { data, workers, marks, sent } = wiring;

  return {
    data,
    workers,
    marks,
    reads: () => readsOf(sent),
    answer: answering(wiring),
    read: reading(wiring),
  };
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
