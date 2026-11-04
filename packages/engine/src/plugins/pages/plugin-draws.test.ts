import { currentPluginSurface } from '@repo/contracts/plugins/kit';
import type { DrawAnswer } from '@repo/contracts/plugins/page-draw';
import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import type { WireJson, WireNode } from '@repo/contracts/plugins/wire';
import { pluginMessageBytes } from '@repo/contracts/plugins/wire-limits';
import { expect, it } from 'vitest';
import type { PluginClock } from '../clock';
import type { PluginEvent } from '../protocol/runtime';
import { PluginFailures } from '../runtime/failures';
import { WorkerCalls } from '../runtime/worker-calls';
import { PluginDraws } from './plugin-draws';
import { leaf, stack, svg } from './tree-fixtures';

type Draws = {
  pages: PluginDraws;
  workers: WorkerCalls;
  sent: PluginEvent[];
  failures: PluginFailures;
};

const idleClock: PluginClock = {
  now: () => 0,
  delay: () => Promise.resolve(),
  schedule: () => () => null,
};

function draws(log: (line: string) => void = (): null => null): Draws {
  const sent: PluginEvent[] = [];

  const send = (_pluginId: string, event: PluginEvent): number =>
    sent.push(event);

  const workers = new WorkerCalls({ send, clock: idleClock });

  const failures = new PluginFailures((pluginId) => ({
    pluginId,
    name: 'Atlas',
  }));

  const pages = new PluginDraws({
    workers,
    log,
    written: () => null,
    drawings: failures,
  });

  return { pages, workers, sent, failures };
}

// The App draws today's Plugin trees.
const surface = currentPluginSurface('web');

async function listed(failures: PluginFailures): Promise<PluginFailure[]> {
  const watching = new AbortController();
  const { value } = await failures.watch(watching.signal).next();

  watching.abort();

  return value ?? [];
}

// One draw of `path`, answered by the running worker with what it sends.
async function drawn(
  { pages, sent }: Draws,
  path: string,
  answer: { root: WireJson } | { error: string },
): Promise<DrawAnswer> {
  const drawing = pages.answer('atlas', {
    path,
    pageState: {},
    pages: 1,
    surface,
  });
  const event = sent.at(-1);
  const id = event?.type === 'draw' ? event.id : -1;
  const caller = { pluginId: 'atlas', generation: 1 };

  pages.receive(
    caller,
    'root' in answer
      ? { action: 'drawn', id, root: answer.root, pages: 1 }
      : { action: 'failed', id, error: answer.error },
  );

  return drawing;
}

const rows = (count: number): WireJson =>
  JSON.parse(
    JSON.stringify(
      stack(Array.from({ length: count }, (_, n) => leaf(`${n}`, {}))),
    ),
  );

// One draw of `/list` showing `count` rows, answered by that generation of the worker.
type Listed = { count: number; generation: number; known?: string };

async function drawList(
  { pages, sent }: Draws,
  { count, generation, known }: Listed,
): Promise<DrawAnswer> {
  const at = { path: '/list', pageState: {}, pages: count, surface };
  const answer = pages.answer('tracker', at, known);
  const event = sent.at(-1);
  const id = event?.type === 'draw' ? event.id : -1;

  pages.receive(
    { pluginId: 'tracker', generation },
    { action: 'drawn', id, root: rows(count), pages: count },
  );

  return answer;
}

const hashOf = (answer: DrawAnswer): string | undefined =>
  'hash' in answer ? answer.hash : undefined;

it('answers a load more with its rows against the tree last sent, and forgets that tree when the Plugin runs again', async () => {
  const drawing = draws();

  drawing.workers.run('tracker', 1);

  const first = await drawList(drawing, { count: 1, generation: 1 });

  const more = await drawList(drawing, {
    count: 2,
    generation: 1,
    known: hashOf(first),
  });

  drawing.workers.release('tracker');
  drawing.workers.run('tracker', 2);

  expect(first.kind).toBe('tree');
  expect(more.kind).toBe('append');
  expect(
    (await drawList(drawing, { count: 3, generation: 2, known: hashOf(more) }))
      .kind,
  ).toBe('tree');
});

it('draws a page without the SVG the sanitiser refused, and logs what it left out', async () => {
  const logs: string[] = [];
  const { pages, workers } = draws((line) => logs.push(line));
  const at = { path: '/map', pageState: {}, pages: 1, surface };

  workers.run('atlas', 1);

  const drawn = pages.answer('atlas', at);

  // The worker sends its tree as JSON.
  const root: WireJson = JSON.parse(
    JSON.stringify(stack([svg('<svg><script/></svg>', 'unsafe')])),
  );

  pages.receive(
    { pluginId: 'atlas', generation: 1 },
    { action: 'drawn', id: 0, root, pages: 1 },
  );

  expect(await drawn).toMatchObject({ kind: 'tree', root: { children: [] } });
  expect(logs).toEqual([
    'Plugin atlas: refused /map node Stack#root/Svg#unsafe: element <script> refused',
  ]);
});

it('tells its listeners when the running worker says what it shows changed', () => {
  const { pages, workers } = draws();
  const marked: string[] = [];

  pages.onChanged((pluginId) => marked.push(pluginId));
  workers.run('tracker', 2);
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'changed' });
  pages.receive({ pluginId: 'tracker', generation: 2 }, { action: 'changed' });

  expect(marked).toEqual(['tracker']);
});

it('stops telling a listener that unsubscribed', () => {
  const { pages, workers } = draws();
  const marked: string[] = [];

  const unsubscribe = pages.onChanged((pluginId) => marked.push(pluginId));
  workers.run('tracker', 1);
  unsubscribe();
  pages.receive({ pluginId: 'tracker', generation: 1 }, { action: 'changed' });

  expect(marked).toEqual([]);
});

it('tells its listeners when an Operation of a running Plugin ran', () => {
  const { pages, workers } = draws();
  const marked: string[] = [];

  pages.onChanged((pluginId) => marked.push(pluginId));
  pages.changedBy('tracker');
  workers.run('tracker', 1);
  pages.changedBy('tracker');

  expect(marked).toEqual(['tracker']);
});

const json = (root: WireNode): WireJson => JSON.parse(JSON.stringify(root));

const tooLarge: WireJson = {
  type: 'Stack',
  key: 'root',
  huge: 'x'.repeat(pluginMessageBytes),
};

it('logs a page that fails to draw once however often it fails, and the App shows one failure for the Plugin', async () => {
  const logs: string[] = [];
  const drawing = draws((line) => logs.push(line));

  drawing.workers.run('atlas', 1);
  await drawn(drawing, '/map', { error: 'Atlas threw' });
  await drawn(drawing, '/map', { error: 'Atlas threw' });
  await drawn(drawing, '/files', { root: tooLarge });

  expect(logs).toEqual([
    'Plugin atlas: could not draw /map: Atlas threw',
    `Plugin atlas: refused /files: page message exceeds ${pluginMessageBytes} bytes`,
  ]);
  expect(await listed(drawing.failures)).toMatchObject([
    {
      kind: 'drawing',
      pluginId: 'atlas',
      message: `page message exceeds ${pluginMessageBytes} bytes`,
    },
  ]);
});

it("clears a page's failure when it draws, and leaves another page's failed", async () => {
  const drawing = draws();

  drawing.workers.run('atlas', 1);
  await drawn(drawing, '/map', { error: 'Atlas threw' });
  await drawn(drawing, '/files', { error: 'Files threw' });
  await drawn(drawing, '/files', { root: json(stack([])) });

  expect(await listed(drawing.failures)).toMatchObject([
    { kind: 'drawing', message: 'Atlas threw' },
  ]);

  await drawn(drawing, '/map', { root: json(stack([])) });

  expect(await listed(drawing.failures)).toEqual([]);
});
