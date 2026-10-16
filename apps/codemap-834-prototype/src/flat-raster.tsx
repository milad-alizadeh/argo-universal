import {
  AlphaType,
  ColorType,
  Skia,
  type SkImage,
  type SkPicture,
  type SkSurface,
} from '@shopify/react-native-skia';
import { useEffect, useRef, type JSX, type RefObject } from 'react';
import type { FlatContext } from './flat-context';
import type { FlatFrame, FlatViewport } from './flat-viewport';

export interface FlatDrawing {
  ctx: FlatContext;
  picture: SkPicture;
}

/** Everything a draw reads; the raster redraws only when one of these changes. */
interface Raster {
  picture: SkPicture;
  viewport: FlatViewport;
  frame: FlatFrame;
  background: string;
}

function paint(surface: SkSurface, raster: Raster): void {
  const canvas = surface.getCanvas();
  const { x, y, scale } = raster.viewport.transform();
  canvas.clear(Skia.Color(raster.background));
  canvas.translate(x, y);
  canvas.scale(scale, scale);
  canvas.drawPicture(raster.picture);
  surface.flush();
}

function pixels(image: SkImage, canvas: HTMLCanvasElement): Uint8ClampedArray {
  const data = image.readPixels(0, 0, {
    width: canvas.width,
    height: canvas.height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });

  if (!data) throw new Error('Skia could not read the flat map pixels');

  return new Uint8ClampedArray(data);
}

function copy(surface: SkSurface, canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');

  if (!context) throw new Error('The flat map requires a 2D canvas');
  const image = surface.makeImageSnapshot();

  try {
    const data = context.createImageData(canvas.width, canvas.height);
    data.data.set(pixels(image, canvas));
    context.putImageData(data, 0, 0);
  } finally {
    image.dispose();
  }
}

function draw(canvas: HTMLCanvasElement, raster: Raster): void {
  canvas.width = Math.round(raster.frame.size.width);
  canvas.height = Math.round(raster.frame.size.height);
  const surface = Skia.Surface.Make(canvas.width, canvas.height);

  if (!surface) throw new Error('Skia could not create a CPU surface');

  try {
    paint(surface, raster);
    copy(surface, canvas);
  } finally {
    surface.dispose();
  }
}

function report(onReady: FlatContext['onReady'], files: number): void {
  onReady({ engine: 'Skia / CanvasKit CPU', files, dpr: 1 });
}

function rasterOf({ ctx, picture }: FlatDrawing): Raster {
  const { viewport, frame, palette } = ctx;

  return { picture, viewport, frame, background: palette.card };
}

type CanvasRef = RefObject<HTMLCanvasElement | null>;

function useRaster(drawing: FlatDrawing, ref: CanvasRef): void {
  const reported = useRef(false);
  const { picture, viewport, frame, background } = rasterOf(drawing);
  const { onReady, tiles } = drawing.ctx;
  const files = tiles.length;

  useEffect(() => {
    if (!ref.current) return;
    draw(ref.current, { picture, viewport, frame, background });

    if (reported.current) return;
    reported.current = true;
    report(onReady, files);
  }, [picture, viewport, frame, background, onReady, files, ref]);
}

export function FlatRaster(props: FlatDrawing): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { size } = props.ctx;
  useRaster(props, ref);

  return (
    <canvas ref={ref} style={{ width: size.width, height: size.height }} />
  );
}
