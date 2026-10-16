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

interface Drawing {
  ctx: FlatContext;
  picture: SkPicture;
}

const halves = 2;

function paint(surface: SkSurface, { ctx, picture }: Drawing): void {
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color(ctx.palette.card));
  canvas.translate(
    ctx.size.width / halves + ctx.camera.x,
    ctx.size.height / halves + ctx.camera.y,
  );
  const zoom = ctx.scale * ctx.camera.zoom;
  canvas.scale(zoom, zoom);
  canvas.drawPicture(picture);
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

function draw(canvas: HTMLCanvasElement, drawing: Drawing): void {
  canvas.width = Math.round(drawing.ctx.size.width);
  canvas.height = Math.round(drawing.ctx.size.height);
  const surface = Skia.Surface.Make(canvas.width, canvas.height);

  if (!surface) throw new Error('Skia could not create a CPU surface');

  try {
    paint(surface, drawing);
    copy(surface, canvas);
  } finally {
    surface.dispose();
  }
}

function report(ctx: FlatContext): void {
  ctx.onReady({
    engine: 'Skia / CanvasKit CPU',
    files: ctx.tiles.length,
    dpr: 1,
  });
}

function useRaster(
  drawing: Drawing,
  ref: RefObject<HTMLCanvasElement | null>,
): void {
  const reported = useRef(false);
  useEffect(() => {
    if (!ref.current) return;
    draw(ref.current, drawing);

    if (reported.current) return;
    reported.current = true;
    report(drawing.ctx);
  }, [drawing, ref]);
}

export function FlatRaster(props: Drawing): JSX.Element {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { size } = props.ctx;
  useRaster(props, ref);

  return (
    <canvas ref={ref} style={{ width: size.width, height: size.height }} />
  );
}
