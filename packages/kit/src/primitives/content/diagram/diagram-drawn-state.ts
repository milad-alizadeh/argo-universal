import {
  type DiagramDrawing,
  type DiagramPalette,
  drawDiagram,
} from '@repo/contracts/kit-diagram';
import { LRUCache } from 'lru-cache';

export type DiagramState =
  | { kind: 'pending' }
  | { kind: 'drawn'; drawing: DiagramDrawing }
  | { kind: 'failed' };

// Enough for the diagrams a Feed holds.
const drawnStates = new LRUCache<string, DiagramState>({ max: 100 });

// A mount's palette object lives as long as its theme does, so it is written out once.
const paletteKeys = new WeakMap<DiagramPalette, string>();

function paletteKey(palette: DiagramPalette): string {
  const known = paletteKeys.get(palette);

  if (known !== undefined) return known;

  const key = JSON.stringify(palette);
  paletteKeys.set(palette, key);

  return key;
}

function laidOut(source: string, palette: DiagramPalette): DiagramState {
  const drawing = drawDiagram(source, palette);

  return drawing ? { kind: 'drawn', drawing } : { kind: 'failed' };
}

/*
 * A row that remounts or is recycled draws the same diagram again, so a drawing is kept per source and palette
 * rather than per mount.
 */
export function drawnState(
  source: string,
  palette: DiagramPalette,
): DiagramState {
  const key = `${paletteKey(palette)}\n${source}`;
  const known = drawnStates.get(key);

  if (known) return known;

  const state = laidOut(source, palette);
  drawnStates.set(key, state);

  return state;
}
