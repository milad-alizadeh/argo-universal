import type { Layer, Snapshot } from './snapshot-model.mts';

// The frames a component card shows off: the first frame inside a presentation slot.
const SLOT =
  /^(?:Cell(?: \/ .*)?|Cells|Desktop|Phone|Demo(?: \/ .*)?|Demos|Content|Popover|Sheet|Desktop \(Popover\)|Phone \(Sheet\))$/;
// Names Paper gives by default say nothing about what a frame is.
export const UNNAMED = /^Frame(?: \d+)?$/;
const CARD_PREFIX = 'Components / ';

function isCandidate(layer: Layer): boolean {
  return (
    layer.type === 'Frame' &&
    !SLOT.test(layer.name) &&
    !UNNAMED.test(layer.name)
  );
}

function parentOf(snapshot: Snapshot, layer: Layer): Layer | undefined {
  return snapshot.layers[layer.parent ?? ''];
}

function isOnCard(snapshot: Snapshot, layer: Layer): boolean {
  for (let at = parentOf(snapshot, layer); at; at = parentOf(snapshot, at))
    if (at.name.startsWith(CARD_PREFIX)) return true;
  return false;
}

function isPresented(snapshot: Snapshot, layer: Layer): boolean {
  const parent = parentOf(snapshot, layer);
  return (
    parent !== undefined && SLOT.test(parent.name) && isOnCard(snapshot, layer)
  );
}

function childrenOf(snapshot: Snapshot, id: string): string[] {
  return snapshot.layers[id]?.children ?? [];
}

// Every layer id, artboard by artboard, each parent before its children.
function documentOrder(snapshot: Snapshot): string[] {
  const order: string[] = [];
  const pending = snapshot.artboards
    .map((board): string => board.id)
    .toReversed();
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    order.push(id);
    pending.push(...childrenOf(snapshot, id).toReversed());
  }
  return order;
}

// The first presented frame of each name, in document order: the master candidates.
export function presentedFrames(snapshot: Snapshot): Layer[] {
  const seen = new Set<string>();
  return documentOrder(snapshot)
    .flatMap((id): Layer[] =>
      snapshot.layers[id] ? [snapshot.layers[id]] : [],
    )
    .filter(
      (layer): boolean => isCandidate(layer) && isPresented(snapshot, layer),
    )
    .filter(
      (layer): boolean =>
        !seen.has(layer.name) && Boolean(seen.add(layer.name)),
    );
}
