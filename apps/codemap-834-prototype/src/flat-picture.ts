import {
  Skia,
  type SkCanvas,
  type SkPaint,
  type SkPicture,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';
import type { FlatContext } from './flat-context';
import { tileColor, type Tile } from './model';

const recordingBounds = { x: -51, y: -41, w: 102, h: 82 };

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
