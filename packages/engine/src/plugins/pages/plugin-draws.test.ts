import type { DrawAnswer } from '@repo/contracts/plugins/page-draw';
import { wireJsonOf, type WireJson } from '@repo/contracts/plugins/wire';
import { expect, it } from 'vitest';
import { draws, lastDraw, surface, type Draws } from './plugin-draws-fixtures';
import { leaf, stack, svg } from './tree-fixtures';

const rows = (count: number): WireJson =>
  wireJsonOf(stack(Array.from({ length: count }, (_, n) => leaf(`${n}`, {}))));

// One draw of `/list` showing `count` rows, answered by that generation of the worker.
type Listed = { count: number; generation: number; known?: string };

async function drawList(
  { pages, sent }: Draws,
  { count, generation, known }: Listed,
): Promise<DrawAnswer> {
  const at = { path: '/list', pageState: {}, pages: count, surface };
  const answer = pages.answer('tracker', at, known);
  const id = lastDraw(sent);

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
  const root = wireJsonOf(stack([svg('<svg><script/></svg>', 'unsafe')]));

  pages.receive(
    { pluginId: 'atlas', generation: 1 },
    { action: 'drawn', id: 0, root, pages: 1 },
  );

  expect(await drawn).toMatchObject({ kind: 'tree', root: { children: [] } });
  expect(logs).toEqual([
    'Plugin atlas: refused /map node Stack#root/Svg#unsafe: element <script> refused',
  ]);
});
