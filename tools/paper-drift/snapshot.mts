import type { PaperPort } from './paper-port.mts';
import {
  readBasicInfo,
  readChildren,
  readComputedStyles,
  readTokens,
  readTreeSummary,
} from './paper-tools.mts';
import {
  boardKind,
  type Artboard,
  type Layer,
  type Snapshot,
  type Styles,
} from './snapshot-model.mts';
import { placeRows, type Index } from './summary-placement.mts';
import {
  layerCount,
  parseTreeSummary,
  type SummaryRow,
} from './tree-summary.mts';

// get_tree_summary silently stops after this many layers.
const SUMMARY_CAP = 1000;
const STYLE_BATCH = 250;

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

async function readStyles(
  paper: PaperPort,
  ids: string[],
): Promise<Record<string, Styles>> {
  const styles: Record<string, Styles> = {};
  for (let start = 0; start < ids.length; start += STYLE_BATCH)
    Object.assign(
      styles,
      await readComputedStyles(paper, ids.slice(start, start + STYLE_BATCH)),
    );
  return styles;
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

export interface SnapshotRun {
  paper: PaperPort;
  fileId: string;
  report: (message: string) => void;
}

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

export async function takeSnapshot(run: SnapshotRun): Promise<Snapshot> {
  const artboards = await listArtboards(run.paper);
  const layers = await indexArtboards(run, artboards);
  run.report(`Reading styles of ${Object.keys(layers).length} layers`);
  const styles = await readStyles(run.paper, Object.keys(layers));
  const tokens = await readTokens(run.paper);
  return {
    fileId: run.fileId,
    takenAt: new Date().toISOString(),
    artboards,
    layers,
    styles,
    tokens,
  };
}
