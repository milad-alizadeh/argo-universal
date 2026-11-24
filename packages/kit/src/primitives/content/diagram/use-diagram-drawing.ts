import { useMemo } from 'react';
import { type DiagramState, drawnState } from './diagram-drawn-state';
import { useDiagramPalette } from './use-diagram-palette';

export type { DiagramState };

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
