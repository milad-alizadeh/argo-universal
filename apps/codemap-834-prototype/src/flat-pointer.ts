import { useEffect, useRef, type RefObject } from 'react';
import type { FlatContext } from './flat-context';
import type { Tile } from './model';

interface Drag {
  x: number;
  y: number;
  startX: number;
  startY: number;
}

type PointerContext = FlatContext & { element: HTMLDivElement };

const clickDistance = 5;

const halves = 2;

function click(event: PointerEvent, drag: Drag | null): boolean {
  if (!drag) return false;

  return (
    Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < clickDistance
  );
}

function horizontal(tile: Tile, x: number): boolean {
  return x >= tile.x && x <= tile.x + tile.w;
}

function vertical(tile: Tile, y: number): boolean {
  return y >= tile.y && y <= tile.y + tile.h;
}

function contains(tile: Tile, point: { x: number; y: number }): boolean {
  return horizontal(tile, point.x) && vertical(tile, point.y);
}

function pick(event: PointerEvent, ctx: PointerContext): void {
  const bounds = ctx.element.getBoundingClientRect();
  const scale = ctx.scale * ctx.camera.zoom;

  const x =
    (event.clientX - bounds.left - ctx.size.width / halves - ctx.camera.x) /
    scale;

  const y =
    (event.clientY - bounds.top - ctx.size.height / halves - ctx.camera.y) /
    scale;

  const tile = ctx.tiles.findLast((candidate) => contains(candidate, { x, y }));

  if (tile) ctx.onSelect(tile.id);
}

function begin(event: PointerEvent, ctx: PointerContext): Drag {
  ctx.element.setPointerCapture(event.pointerId);

  return {
    x: event.clientX,
    y: event.clientY,
    startX: ctx.camera.x,
    startY: ctx.camera.y,
  };
}

function move(
  event: PointerEvent,
  drag: Drag | null,
  ctx: PointerContext,
): void {
  if (!drag) return;
  ctx.setCamera((camera) => ({
    ...camera,
    x: drag.startX + event.clientX - drag.x,
    y: drag.startY + event.clientY - drag.y,
  }));
}

function release(
  event: PointerEvent,
  ctx: PointerContext,
  drag: RefObject<Drag | null>,
): void {
  if (click(event, drag.current)) pick(event, ctx);
  drag.current = null;
}

function attach(ctx: PointerContext, drag: RefObject<Drag | null>): () => void {
  const down = (event: PointerEvent): void => {
    drag.current = begin(event, ctx);
  };

  const moving = (event: PointerEvent): void => move(event, drag.current, ctx);
  const up = (event: PointerEvent): void => release(event, ctx, drag);
  ctx.element.addEventListener('pointerdown', down);
  ctx.element.addEventListener('pointermove', moving);
  ctx.element.addEventListener('pointerup', up);

  return (): void => {
    ctx.element.removeEventListener('pointerdown', down);
    ctx.element.removeEventListener('pointermove', moving);
    ctx.element.removeEventListener('pointerup', up);
  };
}

export function useFlatPointer(ctx: FlatContext): void {
  const drag = useRef<Drag | null>(null);
  useEffect(() => {
    const element = ctx.host.current;

    return element ? attach({ ...ctx, element }, drag) : undefined;
  }, [ctx]);
}
