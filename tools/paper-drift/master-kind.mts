import { copiesOf } from './copy-drift.mts';
import { copyRoot } from './drift-model.mts';
import {
  layerAt,
  stylesOf,
  type Layer,
  type Snapshot,
} from './snapshot-model.mts';
import { diffStyles } from './style-diff.mts';

// Copies keep the master's children; a shell keeps only its root and holds different content each time.
export type Kind = 'master' | 'shell' | 'skip';

// More than this share of same-named frames must look like the master to count as its copies.
const MOSTLY = 0.5;

function shapeOf(snapshot: Snapshot, layer: Layer): string {
  return layer.children
    .map((id): Layer => layerAt(snapshot, id))
    .map((child): string => (child.type === 'Frame' ? child.name : child.type))
    .join('|');
}

function rootMatches(snapshot: Snapshot, master: Layer, copy: Layer): boolean {
  const masterStyles = stylesOf(snapshot, master.id);
  const copyStyles = stylesOf(snapshot, copy.id);
  return diffStyles(masterStyles, copyStyles, copyRoot).length === 0;
}

function isMostly(copies: Layer[], test: (copy: Layer) => boolean): boolean {
  const matching = copies.filter(test).length;
  return copies.length === 0 || matching / copies.length > MOSTLY;
}

export function kindOf(snapshot: Snapshot, master: Layer): Kind {
  const copies = copiesOf(snapshot, master);
  const shape = shapeOf(snapshot, master);
  if (isMostly(copies, (copy): boolean => shapeOf(snapshot, copy) === shape))
    return 'master';
  const shell = isMostly(copies, (copy): boolean =>
    rootMatches(snapshot, master, copy),
  );
  return shell ? 'shell' : 'skip';
}
