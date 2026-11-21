import { useContext, useEffect, useState, type ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { ScrollGestureContext } from '../../../scroll-fade/scroll-gesture';
import {
  DragTracker,
  faderDragThreshold,
  type DragSource,
} from './fader-drag-tracker';

export interface DragFrameProps extends ViewProps {
  source: DragSource;
}

const slop: [number, number] = [-faderDragThreshold, faderDragThreshold];

/*
 * The containing scroll view waits for this pan to recognize or fail. Movement
 * across the Fader's axis fails the pan, leaving the scroll view free to move.
 */
export function DragFrame({ source, ...frame }: DragFrameProps): ReactElement {
  const scroll = useContext(ScrollGestureContext);
  const [tracker] = useState(() => new DragTracker(source));
  const vertical = source.orientation === 'vertical';

  useEffect(() => tracker.update(source));

  const gesture = usePanGesture({
    runOnJS: true,
    enabled: !source.disabled,
    block: scroll,
    activeOffsetX: vertical ? undefined : slop,
    activeOffsetY: vertical ? slop : undefined,
    failOffsetX: vertical ? slop : undefined,
    failOffsetY: vertical ? undefined : slop,
    onActivate: () => tracker.begin(),
    onUpdate: ({ translationX, translationY }) =>
      tracker.dragBy({ dx: translationX, dy: translationY }),
  });

  return (
    <GestureDetector gesture={gesture}>
      <View {...frame} />
    </GestureDetector>
  );
}
