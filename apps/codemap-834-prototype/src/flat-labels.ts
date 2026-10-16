import { useEffect } from 'react';
import type { FlatContext } from './flat-context';
import type { FlatTransform } from './flat-viewport';
import { placeLabels, type LabelAnchors } from './map-labels';
import type { Tile } from './model';

const minimumWidth = 100;

const minimumHeight = 24;

function readable(tile: Tile, scale: number): boolean {
  return tile.w * scale > minimumWidth && tile.h * scale > minimumHeight;
}

/** Flat anchor rule: a label sits on its tile's top-left corner when the tile is big enough to read. */
export function tileCorners({ x, y, scale }: FlatTransform): LabelAnchors {
  return {
    anchor: (tile) =>
      readable(tile, scale)
        ? { x: x + tile.x * scale, y: y + tile.y * scale }
        : undefined,
    exposed: () => true,
    candidates: Number.POSITIVE_INFINITY,
  };
}

export function useFlatLabels(ctx: FlatContext): void {
  const { tiles, viewport, frame, overlay } = ctx;

  useEffect(() => {
    const anchors = tileCorners(viewport.transform());
    const screen = { size: frame.size, insets: overlay.insets };
    overlay.showLabels(placeLabels(tiles, anchors, screen));
  }, [tiles, viewport, frame, overlay]);
}
