import { useEffect, useMemo } from 'react';
import type { FlatContext } from './flat-context';
import type { FlatViewport } from './flat-viewport';
import { cullLabels, type Label, type Tile } from './model';

const minimumWidth = 100;

const minimumHeight = 24;

function readable(tile: Tile, viewport: FlatViewport): boolean {
  const corner = viewport.toScreen({ x: tile.x, y: tile.y });

  const opposite = viewport.toScreen({
    x: tile.x + tile.w,
    y: tile.y + tile.h,
  });

  return (
    opposite.x - corner.x > minimumWidth &&
    opposite.y - corner.y > minimumHeight
  );
}

function label(tile: Tile, viewport: FlatViewport): Label {
  return {
    id: tile.id,
    text: tile.path.split('/').pop() ?? tile.path,
    ...viewport.toScreen({ x: tile.x, y: tile.y }),
  };
}

function labels(
  tiles: Tile[],
  ctx: Pick<FlatContext, 'viewport' | 'size'>,
): Label[] {
  const candidates = tiles.flatMap((tile) =>
    readable(tile, ctx.viewport) ? [label(tile, ctx.viewport)] : [],
  );

  return cullLabels(candidates, ctx.size.width, ctx.size.height);
}

export function useFlatLabels(ctx: FlatContext): void {
  const { tiles, viewport, frame, onLabels } = ctx;

  const ordered = useMemo(
    () => [...tiles].sort((a, b) => b.area - a.area),
    [tiles],
  );

  useEffect(
    () => onLabels(labels(ordered, { viewport, size: frame.size })),
    [ordered, viewport, frame, onLabels],
  );
}
