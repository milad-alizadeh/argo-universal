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

type Draw = typeof drawDiagram;

function laidOut(
  source: string,
  palette: DiagramPalette,
  draw: Draw,
): DiagramState {
  const drawing = draw(source, palette);

  return drawing ? { kind: 'drawn', drawing } : { kind: 'failed' };
}

/*
 * A row that remounts or is recycled draws the same diagram again, so a drawing is kept per source and palette
 * rather than per mount.
 */
// `draw` is the layout, which a test passes its own to count.
export function drawnState(
  source: string,
  palette: DiagramPalette,
  draw: Draw = drawDiagram,
): DiagramState {
  const key = `${paletteKey(palette)}\n${source}`;
  const known = drawnStates.get(key);

  if (known) return known;

  const state = laidOut(source, palette, draw);
  drawnStates.set(key, state);

  return state;
}
