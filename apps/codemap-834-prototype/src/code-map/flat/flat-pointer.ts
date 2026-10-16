import { useEffect } from 'react';
import {
  listen,
  usePointerPick,
  type PointerListener,
} from '../viewport/pointer-pick';
import type { ScreenPoint } from '../viewport/viewport';
import type { FlatContext } from './flat-context';
import type { FlatViewport } from './flat-viewport';

interface PanTarget {
  element: HTMLDivElement;
  viewport: FlatViewport;
}

interface Drag {
  target: PanTarget;
  last: ScreenPoint | null;
}

function press(drag: Drag, event: PointerEvent): void {
  drag.target.element.setPointerCapture(event.pointerId);
  drag.last = { x: event.clientX, y: event.clientY };
}

function move(drag: Drag, event: PointerEvent): void {
  if (!drag.last) return;
  const { x, y } = drag.last;
  drag.target.viewport.pan({ x: event.clientX - x, y: event.clientY - y });
  drag.last = { x: event.clientX, y: event.clientY };
}

function end(drag: Drag): void {
  drag.last = null;
}

function dragging(target: PanTarget): PointerListener[] {
  const drag: Drag = { target, last: null };

  return [
    ['pointerdown', (event): void => press(drag, event)],
    ['pointermove', (event): void => move(drag, event)],
    ['pointerup', (): void => end(drag)],
  ];
}

/** Drag pans the flat view; a press without a drag selects the file under it. */
export function useFlatPointer({
  host,
  viewport,
  onSelect,
}: FlatContext): void {
  usePointerPick(host, viewport, onSelect);
  useEffect(() => {
    const element = host.current;

    return element
      ? listen(element, dragging({ element, viewport }))
      : undefined;
  }, [host, viewport]);
}
