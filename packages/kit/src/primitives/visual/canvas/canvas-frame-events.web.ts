import type { HTMLAttributes, PointerEvent, KeyboardEvent } from 'react';
import { keyCamera } from './canvas-camera';
import type { CanvasGesture } from './canvas-gesture';
import type { CanvasFrameProps, Point } from './canvas-props';

export function localPoint(
  event: { clientX: number; clientY: number },
  host: HTMLDivElement,
): Point {
  const rect = host.getBoundingClientRect();

  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function keyboard(
  event: KeyboardEvent<HTMLDivElement>,
  props: CanvasFrameProps,
): void {
  if (props.camera !== 'pan-zoom') return;
  const host = event.currentTarget;

  const view = keyCamera(event.key, props.view, {
    x: host.clientWidth / 2,
    y: host.clientHeight / 2,
  });

  if (!view) return;
  event.preventDefault();
  props.onCamera(view);
}

function press(
  event: PointerEvent<HTMLDivElement>,
  gesture: CanvasGesture,
  props: CanvasFrameProps,
): void {
  gesture.begin(
    { id: event.pointerId, point: localPoint(event, event.currentTarget) },
    props.view,
  );

  if (!event.nativeEvent.isTrusted) return;

  event.currentTarget.setPointerCapture(event.pointerId);
}

function move(
  event: PointerEvent<HTMLDivElement>,
  gesture: CanvasGesture,
  props: CanvasFrameProps,
): void {
  const point = localPoint(event, event.currentTarget);
  const view = gesture.move({ id: event.pointerId, point });

  if (!view) return props.onHover(point);

  if (props.camera === 'pan-zoom') props.onCamera(view);
}

function release(
  event: PointerEvent<HTMLDivElement>,
  gesture: CanvasGesture,
  props: CanvasFrameProps,
): void {
  if (gesture.release(event.pointerId))
    props.onPress(localPoint(event, event.currentTarget));
}

export function frameEvents(
  props: CanvasFrameProps,
  gesture: CanvasGesture,
): HTMLAttributes<HTMLDivElement> {
  return {
    onKeyDown: (event) => keyboard(event, props),
    onPointerDown: (event) => press(event, gesture, props),
    onPointerMove: (event) => move(event, gesture, props),
    onPointerUp: (event) => release(event, gesture, props),
    onPointerCancel: (event) => gesture.cancel(event.pointerId),
    onPointerLeave: (event) => leave(event, gesture, props),
    onLostPointerCapture: (event) => gesture.cancel(event.pointerId),
  };
}

function leave(
  event: PointerEvent<HTMLDivElement>,
  gesture: CanvasGesture,
  props: CanvasFrameProps,
): void {
  gesture.cancel(event.pointerId);
  props.onHover();
}
