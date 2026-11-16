import {
  type DiagramDrawing,
  type DiagramPalette,
  drawDiagram,
} from '@repo/contracts/kit-diagram';
import { useMemo } from 'react';
import { useDiagramPalette } from './use-diagram-palette';

export type DiagramState =
  | { kind: 'pending' }
  | { kind: 'drawn'; drawing: DiagramDrawing }
  | { kind: 'failed' };

function drawnState(source: string, palette: DiagramPalette): DiagramState {
  const drawing = drawDiagram(source, palette);

  return drawing ? { kind: 'drawn', drawing } : { kind: 'failed' };
}

/*
 * Drawing lays the graph out, the one costly step, so it waits for the fence to close and then runs once per
 * source and theme rather than on every streamed token.
 */
export function useDiagramDrawing(
  source: string,
  pending: boolean,
): DiagramState {
  const palette = useDiagramPalette();

  return useMemo(
    () =>
      pending || !palette ? { kind: 'pending' } : drawnState(source, palette),
    [source, pending, palette],
  );
}
