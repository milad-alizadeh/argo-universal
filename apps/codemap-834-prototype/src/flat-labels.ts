import { useEffect, useMemo } from 'react';
import type { FlatContext } from './flat-context';
import { cullLabels, type Label, type Tile } from './model';

const minimumWidth = 100;

const minimumHeight = 24;

const halves = 2;

type Projection = Pick<FlatContext, 'size' | 'camera' | 'scale'>;

function readable(tile: Tile, ctx: Projection): boolean {
  return (
    tile.w * ctx.scale * ctx.camera.zoom > minimumWidth &&
    tile.h * ctx.scale * ctx.camera.zoom > minimumHeight
  );
}

function label(tile: Tile, ctx: Projection): Label {
  return {
    id: tile.id,
    text: tile.path.split('/').pop() ?? tile.path,
    x:
      ctx.size.width / halves +
      ctx.camera.x +
      tile.x * ctx.scale * ctx.camera.zoom,
    y:
      ctx.size.height / halves +
      ctx.camera.y +
      tile.y * ctx.scale * ctx.camera.zoom,
  };
}

function labels(tiles: Tile[], ctx: Projection): Label[] {
  const candidates = tiles.flatMap((tile) =>
    readable(tile, ctx) ? [label(tile, ctx)] : [],
  );

  return cullLabels(candidates, ctx.size.width, ctx.size.height);
}

export function useFlatLabels(ctx: FlatContext): void {
  const { tiles, size, camera, scale, onLabels } = ctx;

  const ordered = useMemo(
    () => [...tiles].sort((a, b) => b.area - a.area),
    [tiles],
  );

  useEffect(
    () => onLabels(labels(ordered, { size, camera, scale })),
    [ordered, size, camera, scale, onLabels],
  );
}
