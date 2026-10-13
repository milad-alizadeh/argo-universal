import { type PointerEvent, type RefObject, useRef } from 'react';
import type { PanelResizeHandleProps } from './panel-resize-handle';

type ResizeDrag = RefObject<{
  pointer: number;
  position: number;
  width: number;
} | null>;

type HandlePointerEvent = PointerEvent<HTMLDivElement>;

interface PointerResizeHandlers {
  onPointerDown: (event: HandlePointerEvent) => void;
  onPointerMove: (event: HandlePointerEvent) => void;
  onPointerUp: (event: HandlePointerEvent) => void;
  onLostPointerCapture: () => void;
}

type PointerResizeProps = Pick<
  PanelResizeHandleProps,
  'value' | 'direction' | 'onChange' | 'onDragStateChange'
>;

function startDrag(
  drag: ResizeDrag,
  event: HandlePointerEvent,
  { value, onDragStateChange }: PointerResizeProps,
): void {
  onDragStateChange?.(true);
  drag.current = {
    pointer: event.pointerId,
    position: event.clientX,
    width: value,
  };
  event.currentTarget.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function followDrag(
  drag: ResizeDrag,
  event: HandlePointerEvent,
  { direction, onChange }: PointerResizeProps,
): void {
  if (drag.current?.pointer === event.pointerId)
    onChange(
      drag.current.width + (event.clientX - drag.current.position) * direction,
    );
}

function endDrag(
  drag: ResizeDrag,
  { onDragStateChange }: PointerResizeProps,
): void {
  drag.current = null;
  onDragStateChange?.(false);
}

function releaseCapture(event: HandlePointerEvent): void {
  if (event.currentTarget.hasPointerCapture(event.pointerId))
    event.currentTarget.releasePointerCapture(event.pointerId);
}

export function usePointerResize(
  props: PointerResizeProps,
): PointerResizeHandlers {
  const drag: ResizeDrag = useRef(null);

  return {
    onPointerDown: (event) => startDrag(drag, event, props),
    onPointerMove: (event) => followDrag(drag, event, props),
    onPointerUp: (event) => {
      endDrag(drag, props);
      releaseCapture(event);
    },
    onLostPointerCapture: () => endDrag(drag, props),
  };
}
