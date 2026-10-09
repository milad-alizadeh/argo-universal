import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { PaperPort } from './paper-drift/paper-port.mts';
import {
  snapshotSchema,
  type Snapshot,
} from './paper-drift/snapshot-model.mts';
import { takeSnapshot } from './paper-drift/snapshot.mts';

// A Paper file of one artboard, answered by a fake port that records which layers' styles were read.
interface FakeLayer {
  id: string;
  name: string;
  children?: FakeLayer[];
}

interface FakeFile {
  board: FakeLayer;
  jsx: Record<string, string>;
  tokens: Record<string, string>;
}

function leaves(prefix: string, count: number): FakeLayer[] {
  return Array.from({ length: count }, (_, index): FakeLayer => ({
    id: `${prefix}L${index}-0`,
    name: 'Leaf',
  }));
}

function group(id: string): FakeLayer {
  return { id: `${id}-0`, name: 'Group', children: leaves(id, 200) };
}

// Cards 1-0 and 4-0 fit in one unit each; 7-0 is too big, so each of its groups is a unit.
function board(): FakeLayer {
  return {
    id: 'B-0',
    name: 'Components / Test',
    children: [
      {
        id: '1-0',
        name: 'Card A',
        children: [
          { id: '2-0', name: 'Title' },
          { id: '3-0', name: 'Body' },
        ],
      },
      { id: '4-0', name: 'Card B', children: [{ id: '5-0', name: 'Label' }] },
      { id: '6-0', name: 'Note' },
      { id: '7-0', name: 'Big card', children: ['G1', 'G2', 'G3'].map(group) },
    ],
  };
}

function file(): FakeFile {
  return { board: board(), jsx: {}, tokens: { '--a': '1px' } };
}

function summaryRows(layer: FakeLayer, depth: number): string[] {
  return [
    `${'  '.repeat(depth)}Frame "${layer.name}" (${layer.id}) 10x10`,
    ...(layer.children ?? []).flatMap((child): string[] =>
      summaryRows(child, depth + 1),
    ),
  ];
}

function find(layer: FakeLayer, id: string): FakeLayer | undefined {
  if (layer.id === id) return layer;
  return (layer.children ?? [])
    .map((child): FakeLayer | undefined => find(child, id))
    .find(Boolean);
}

const nodeIdsSchema = z.object({ nodeIds: z.array(z.string()) });
const nodeIdSchema = z.object({ nodeId: z.string() });

function fakePaper(
  fake: FakeFile,
  styleReads: string[],
): Record<string, (args: Record<string, unknown>) => unknown> {
  return {
    get_basic_info: (args): unknown =>
      args['pageId'] === undefined
        ? { pages: [{ id: 'p', name: 'Page' }], artboards: [] }
        : { pages: [], artboards: [{ id: 'B-0', name: fake.board.name }] },
    get_tree_summary: (): unknown => ({
      summary: summaryRows(fake.board, 0).join('\n'),
    }),
    get_jsx: (args): unknown =>
      fake.jsx[nodeIdSchema.parse(args).nodeId] ?? '<div />',
    get_computed_styles: (args): unknown => {
      const { nodeIds } = nodeIdsSchema.parse(args);
      styleReads.push(...nodeIds);
      return { styles: Object.fromEntries(nodeIds.map((id) => [id, {}])) };
    },
    get_tokens: (): unknown => ({
      tokens: Object.entries(fake.tokens).map(([name, value]) => ({
        name,
        value,
      })),
    }),
  };
}

function ignoreReport(): void {}

// Takes a snapshot of the fake file and returns it with the ids whose styles were read from Paper.
async function snapshotOf(
  fake: FakeFile,
  previous?: Snapshot,
): Promise<{ taken: Snapshot; styleReads: string[] }> {
  const styleReads: string[] = [];
  const answers = fakePaper(fake, styleReads);
  const paper: PaperPort = {
    call: (tool, args): Promise<unknown> =>
      Promise.resolve(answers[tool]?.(args)),
    close: (): Promise<void> => Promise.resolve(),
  };
  const run = { paper, fileId: 'file', report: ignoreReport };
  const taken = await takeSnapshot(run, previous);
  return { taken, styleReads };
}

const alwaysRead = ['B-0', '1-0', '4-0', '6-0', '7-0', 'G1-0', 'G2-0', 'G3-0'];
const layerCount = 1 + 3 + 2 + 1 + 1 + 3 * 201;

describe('an incremental snapshot', (): void => {
  it('reads every layer when there is no earlier snapshot', async (): Promise<void> => {
    const { styleReads } = await snapshotOf(file());
    expect(styleReads).toHaveLength(layerCount);
  });

  it('reads only the artboards, big containers and unit roots when nothing changed', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const { styleReads } = await snapshotOf(file(), taken);
    expect(styleReads).toEqual(alwaysRead);
  });

  it('keeps styles for every layer when it reuses units', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const again = (await snapshotOf(file(), taken)).taken;
    expect(Object.keys(again.styles).sort()).toEqual(
      Object.keys(again.layers).sort(),
    );
  });

  it('reads a unit again when its JSX changed', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const edited = file();
    edited.jsx['1-0'] = '<div style={{ gap: 4 }} />';
    const { styleReads } = await snapshotOf(edited, taken);
    expect(styleReads).toEqual([...alwaysRead, '2-0', '3-0']);
  });

  it('reads a unit again when a layer in it was renamed', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const edited = file();
    const label = find(edited.board, '5-0');
    if (label) label.name = 'Caption';
    const { styleReads } = await snapshotOf(edited, taken);
    expect(styleReads).toEqual([...alwaysRead, '5-0']);
  });

  it('reads only the changed part of a container too big for one unit', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const edited = file();
    edited.jsx['G2-0'] = '<div style={{ gap: 4 }} />';
    const { styleReads } = await snapshotOf(edited, taken);
    expect(styleReads).toEqual([
      ...alwaysRead,
      ...leaves('G2', 200).map((leaf): string => leaf.id),
    ]);
  });

  it('reads every layer when the tokens changed', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const edited = file();
    edited.tokens['--a'] = '2px';
    const { styleReads } = await snapshotOf(edited, taken);
    expect(styleReads).toHaveLength(layerCount);
  });

  it('reads every layer when the earlier snapshot has no fingerprints', async (): Promise<void> => {
    const { taken } = await snapshotOf(file());
    const older = snapshotSchema.parse({ ...taken, fingerprints: undefined });
    const { styleReads } = await snapshotOf(file(), older);
    expect(styleReads).toHaveLength(layerCount);
  });
});
