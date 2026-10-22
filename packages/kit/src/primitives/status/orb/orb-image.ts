'worklet';

import {
  Skia,
  type SkImage,
  type SkPaint,
  type SkSurface,
} from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import { makeDotBuffer } from './engine/core';
import type { Dot, DotBuffer } from './engine/types';
import { inkLevel, minAlpha } from './orb-ink';

// Red, green and blue come first in a colour, then alpha.
const alphaChannel = 3;

// The pen one orb draws with, made on the UI thread and reused every frame until the orb unmounts.
export interface OrbPen {
  surface: SkSurface;
  paint: SkPaint;
  // Made here, not captured: objects a worklet captures are frozen, so they could not be written.
  color: Float32Array;
  dots: DotBuffer;
  size: number;
  density: number;
}

// How an orb inks its dots: mirrored on dark themes, and never smaller than `rMin` px.
export interface OrbInk {
  dark: boolean;
  rMin: number;
}

// A CPU surface: an orb is small, and a GPU one would take a graphics context per orb on web.
function makePen(size: number, density: number): OrbPen {
  const side = Math.ceil(size * density);
  const surface = Skia.Surface.Make(side, side);

  if (!surface) throw new Error('Could not make the orb surface');

  const paint = Skia.Paint();

  paint.setAntiAlias(true);

  return {
    surface,
    paint,
    color: new Float32Array(alphaChannel + 1),
    dots: makeDotBuffer(),
    size,
    density,
  };
}

export function disposePen(slot: SharedValue<OrbPen | null>): void {
  const pen = slot.get();

  if (!pen) return;

  pen.surface.dispose();
  pen.paint.dispose();
  slot.set(null);
}

// The orb's pen for `size`, made on first use and again only when the size changes.
export function penFor(
  slot: SharedValue<OrbPen | null>,
  size: number,
  density: number,
): OrbPen {
  const pen = slot.get();

  if (pen?.size === size) return pen;

  disposePen(slot);

  const next = makePen(size, density);

  slot.set(next);

  return next;
}

function paintDot(pen: OrbPen, dot: Dot, ink: OrbInk): void {
  if (dot.a < minAlpha) return;

  const { paint, color } = pen;

  color.fill(inkLevel(dot.white, ink.dark), 0, alphaChannel);
  color[alphaChannel] = dot.a;
  paint.setColor(color);
  pen.surface
    .getCanvas()
    .drawCircle(dot.x, dot.y, Math.max(ink.rMin, dot.r), paint);
}

function paintDots(pen: OrbPen, ink: OrbInk): void {
  const { dots, count } = pen.dots;

  for (let i = 0; i < count; i++) {
    const dot = dots[i];

    if (dot) paintDot(pen, dot, ink);
  }
}

// An image of another size can't be drawn into, so it is freed and a new one made.
function reusable(previous: SkImage | null, pen: OrbPen): SkImage | undefined {
  if (!previous) return undefined;

  if (previous.width() === pen.surface.width()) return previous;

  previous.dispose();

  return undefined;
}

// Draws the pen's dots into `previous` when it fits, so a frame makes no new image.
export function drawImage(
  pen: OrbPen,
  ink: OrbInk,
  previous: SkImage | null,
): SkImage {
  const { surface, color, density } = pen;
  const canvas = surface.getCanvas();

  canvas.clear(color.fill(0));
  canvas.save();
  canvas.scale(density, density);
  paintDots(pen, ink);
  canvas.restore();
  surface.flush();

  return surface.makeImageSnapshot(undefined, reusable(previous, pen));
}
