import { useEffect, useState } from 'react';
import { PanResponder, type ViewProps } from 'react-native';
import { DragTracker, type DragSource } from './fader-drag-tracker';

// The responder claims the touch only once the finger has moved along the surface, so a tap reaches the content over it.
const responderFor = (tracker: DragTracker): ViewProps =>
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, { dx, dy }) => tracker.takes({ dx, dy }),
    onPanResponderGrant: () => tracker.begin(),
    onPanResponderMove: (_, { dx, dy }) => tracker.dragBy({ dx, dy }),
    onPanResponderTerminationRequest: () => false,
  }).panHandlers;

// iOS and Android: a PanResponder, which measures a touch from where it began.
export function useFaderDrag(source: DragSource): ViewProps {
  const [tracker] = useState(() => new DragTracker(source));
  const [handlers] = useState(() => responderFor(tracker));

  useEffect(() => tracker.update(source));

  return handlers;
}
