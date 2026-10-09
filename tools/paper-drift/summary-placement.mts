import type { PaperPort } from './paper-port.mts';
import type { Layer } from './snapshot-model.mts';
import type { SummaryLayer, SummaryRow } from './tree-summary.mts';

// Builds the layer index from tree summary rows, which give each layer's parent by indentation.
export interface Index {
  paper: PaperPort;
  artboard: string;
  layers: Record<string, Layer>;
  unrecognised: string[];
}

function fieldsOf(
  row: SummaryLayer,
): Omit<Layer, 'parent' | 'artboard' | 'children'> {
  const optional = row.text === undefined ? {} : { text: row.text };
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    hidden: row.hidden,
    ...optional,
  };
}

function newLayer(
  index: Index,
  row: SummaryLayer,
  parent: string | null,
): Layer {
  return { ...fieldsOf(row), parent, artboard: index.artboard, children: [] };
}

function linkChild(parent: Layer | undefined, id: string): void {
  if (parent && !parent.children.includes(id)) parent.children.push(id);
}

function addLayer(
  index: Index,
  row: SummaryLayer,
  parent: string | null,
): void {
  index.layers[row.id] ??= newLayer(index, row, parent);
  if (parent) linkChild(index.layers[parent], row.id);
}

interface Placement {
  parent: string | null;
  stack: string[];
  cut: string[];
}

function ownerOf(placement: Placement, row: SummaryRow): string | null {
  return row.depth === 0
    ? placement.parent
    : (placement.stack[row.depth - 1] ?? null);
}

function placeRow(index: Index, placement: Placement, row: SummaryRow): void {
  const owner = ownerOf(placement, row);
  if (row.kind === 'cut') {
    if (owner) placement.cut.push(owner);
    return;
  }
  addLayer(index, row, owner);
  placement.stack.splice(row.depth, Infinity, row.id);
}

// Places rows by indentation and returns the layers whose children the summary cut off.
export function placeRows(
  index: Index,
  rows: SummaryRow[],
  parent: string | null,
): string[] {
  const placement: Placement = { parent, stack: [], cut: [] };
  for (const row of rows) placeRow(index, placement, row);
  return placement.cut;
}
