import {
  type DiagramDrawing,
  type DiagramPalette,
  drawDiagram,
} from '@repo/contracts/kit-diagram';

export type DiagramState =
  | { kind: 'pending' }
  | { kind: 'drawn'; drawing: DiagramDrawing }
  | { kind: 'failed' };

const drawnStates = new Map<string, DiagramState>();

// Enough for the diagrams a Feed holds; the oldest goes first.
const drawnStateLimit = 100;

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
  const key = JSON.stringify([source, palette]);
  const known = drawnStates.get(key);

  if (known) return known;

  const state = laidOut(source, palette);
  drawnStates.set(key, state);

  if (drawnStates.size > drawnStateLimit)
    drawnStates.delete(drawnStates.keys().next().value ?? key);

  return state;
}
