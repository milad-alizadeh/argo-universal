import { useEffect, useState } from 'react';
import type { PointerEvent, ViewProps } from 'react-native';
import { DragTracker, type DragSource, type Point } from './fader-drag-tracker';

const pointOf = ({ nativeEvent }: PointerEvent): Point => ({
  x: nativeEvent.clientX,
  y: nativeEvent.clientY,
});

// The element is a DOM node on the web; the pointer is captured so a drag that leaves it keeps going.
function capture(event: PointerEvent): void {
  const { currentTarget } = event;

  if (typeof currentTarget !== 'number')
    currentTarget.setPointerCapture(event.nativeEvent.pointerId);
}

const handlersFor = (tracker: DragTracker): ViewProps => ({
  onPointerDown: (event) => tracker.down(pointOf(event)),
  onPointerMove: (event) => {
    if (tracker.move(pointOf(event))) capture(event);
  },
  onPointerUp: () => tracker.up(),
  onPointerCancel: () => tracker.up(),
});

/*
 * The web: pointer events, so a mouse and a finger share one path. The pointer is captured only once it has moved along
 * the surface, so a click on the content over it is still a click.
 */
export function useFaderDrag(source: DragSource): ViewProps {
  const [tracker] = useState(() => new DragTracker(source));
  const [handlers] = useState(() => handlersFor(tracker));

  useEffect(() => tracker.update(source));

  return handlers;
}
