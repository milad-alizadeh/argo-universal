import type { PaperPort } from './paper-port.mts';
import {
  readBasicInfo,
  readChildren,
  readTokens,
  readTreeSummary,
} from './paper-tools.mts';
import {
  boardKind,
  type Artboard,
  type Layer,
  type Snapshot,
} from './snapshot-model.mts';
import { readSnapshotStyles, type StyleRun } from './snapshot-styles.mts';
import { placeRows, type Index } from './summary-placement.mts';
import {
  layerCount,
  parseTreeSummary,
  type SummaryRow,
} from './tree-summary.mts';

// get_tree_summary silently stops after this many layers.
const SUMMARY_CAP = 1000;

async function indexChildren(index: Index, nodeId: string): Promise<void> {
  for (const child of await readChildren(index.paper, nodeId))
    await indexSubtree(index, child.id, nodeId);
}

// A capped summary lists only a prefix of the subtree: keep its root and walk the children one by one.
async function indexCapped(
  index: Index,
  rows: SummaryRow[],
  at: { nodeId: string; parent: string | null },
): Promise<void> {
  placeRows(index, rows.slice(0, 1), at.parent);
  await indexChildren(index, at.nodeId);
}

async function indexSubtree(
  index: Index,
  nodeId: string,
  parent: string | null,
): Promise<void> {
  const parsed = parseTreeSummary(await readTreeSummary(index.paper, nodeId));
  index.unrecognised.push(...parsed.unrecognised);
  if (layerCount(parsed.rows) >= SUMMARY_CAP)
    return indexCapped(index, parsed.rows, { nodeId, parent });
  for (const id of placeRows(index, parsed.rows, parent))
    await indexChildren(index, id);
}

async function listArtboards(paper: PaperPort): Promise<Artboard[]> {
  const artboards: Artboard[] = [];
  for (const page of (await readBasicInfo(paper)).pages)
    for (const board of (await readBasicInfo(paper, page.id)).artboards)
      artboards.push({
        ...board,
        page: page.name,
        kind: boardKind(board.name),
      });
  return artboards;
}

export type SnapshotRun = StyleRun;

async function indexArtboards(
  { paper, report }: SnapshotRun,
  artboards: Artboard[],
): Promise<Record<string, Layer>> {
  const index: Index = { paper, artboard: '', layers: {}, unrecognised: [] };
  for (const board of artboards) {
    report(`Reading ${board.page} › ${board.name}`);
    await indexSubtree({ ...index, artboard: board.id }, board.id, null);
  }
  if (index.unrecognised.length > 0)
    throw new Error(
      `${index.unrecognised.length} tree summary rows were not recognised:\n${index.unrecognised.slice(0, 5).join('\n')}`,
    );
  return index.layers;
}

// Names and structure only, without styles or tokens: enough to plan a rename.
export async function takeLayerSnapshot(run: SnapshotRun): Promise<Snapshot> {
  const artboards = await listArtboards(run.paper);
  const layers = await indexArtboards(run, artboards);
  const takenAt = new Date().toISOString();
  return {
    fileId: run.fileId,
    takenAt,
    artboards,
    layers,
    styles: {},
    tokens: {},
  };
}

// Reuses the styles of units unchanged since the previous snapshot, when one is given.
export async function takeSnapshot(
  run: SnapshotRun,
  previous?: Snapshot,
): Promise<Snapshot> {
  const structure = await takeLayerSnapshot(run);
  const tokens = await readTokens(run.paper);
  const current = { layers: structure.layers, tokens };
  const styles = await readSnapshotStyles(run, current, previous);
  const takenAt = new Date().toISOString();
  return { ...structure, takenAt, tokens, ...styles };
}
