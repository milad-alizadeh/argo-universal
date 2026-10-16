import {
  Skia,
  type SkCanvas,
  type SkPaint,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { mapExtent } from '../layout/treemap';
import { tileColor, type Bounds, type Tile } from '../model';
import type { FlatContext } from './flat-context';

/** World units recorded beyond the extent on every side. */
const recordingMargin = 1;

const sides = 2;

const recordingBounds: Bounds = {
  x: mapExtent.x - recordingMargin,
  y: mapExtent.y - recordingMargin,
  w: mapExtent.w + recordingMargin * sides,
  h: mapExtent.h + recordingMargin * sides,
};

type PictureContext = Pick<FlatContext, 'tiles' | 'palette' | 'selected'>;

function drawTile(
  tile: Tile,
  ctx: PictureContext,
  drawing: { canvas: SkCanvas; paint: SkPaint },
): void {
  const color =
    tile.id === ctx.selected
      ? ctx.palette.foreground
      : tileColor(tile, ctx.palette);

  drawing.paint.setColor(Skia.Color(color));
  drawing.canvas.drawRect(
    Skia.XYWHRect(tile.x, tile.y, tile.w, tile.h),
    drawing.paint,
  );
}

function record(ctx: PictureContext): SkPicture {
  const recorder = Skia.PictureRecorder();
  const { x, y, w, h } = recordingBounds;
  const canvas = recorder.beginRecording(Skia.XYWHRect(x, y, w, h));
  const paint = Skia.Paint();
  paint.setAntiAlias(false);

  for (const tile of ctx.tiles) drawTile(tile, ctx, { canvas, paint });
  const picture = recorder.finishRecordingAsPicture();
  recorder.dispose();
  paint.dispose();

  return picture;
}

export function useFlatPicture({
  tiles,
  palette,
  selected,
}: FlatContext): SkPicture {
  // Skia's asynchronous root retains pictures; CanvasKit finalizes their smart pointers.
  return useMemo(
    () => record({ tiles, palette, selected }),
    [tiles, palette, selected],
  );
}
