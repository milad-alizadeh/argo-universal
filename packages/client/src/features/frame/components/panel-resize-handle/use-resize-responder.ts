import { type RefObject, useLayoutEffect, useRef, useState } from 'react';
import {
  type PanResponderCallbacks,
  type PanResponderInstance,
  PanResponder,
} from 'react-native';
import type { PanelResizeHandleProps } from './panel-resize-handle';

type ResizeGestureProps = Pick<
  PanelResizeHandleProps,
  'value' | 'direction' | 'onChange' | 'onDragStateChange'
>;

type LatestGesture = RefObject<ResizeGestureProps>;

function useLatestGesture({
  value,
  direction,
  onChange,
  onDragStateChange,
}: ResizeGestureProps): LatestGesture {
  const latest = useRef({ value, direction, onChange, onDragStateChange });
  useLayoutEffect(() => {
    latest.current = { value, direction, onChange, onDragStateChange };
  }, [value, direction, onChange, onDragStateChange]);

  return latest;
}

function grantResize(
  latest: LatestGesture,
  startingWidth: RefObject<number>,
): void {
  startingWidth.current = latest.current.value;
  latest.current.onDragStateChange?.(true);
}

function releaseResize(latest: LatestGesture): void {
  latest.current.onDragStateChange?.(false);
}

function moveResize(
  latest: LatestGesture,
  startingWidth: RefObject<number>,
  dx: number,
): void {
  latest.current.onChange(
    startingWidth.current + dx * latest.current.direction,
  );
}

function useStablePanResponder(
  callbacks: PanResponderCallbacks,
): PanResponderInstance {
  const [responder] = useState(() => PanResponder.create(callbacks));

  return responder;
}

export function useResizeResponder(
  props: ResizeGestureProps,
): PanResponderInstance {
  const latest = useLatestGesture(props);
  const startingWidth = useRef(props.value);
  const release = (): void => releaseResize(latest);

  return useStablePanResponder({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => grantResize(latest, startingWidth),
    onPanResponderRelease: release,
    onPanResponderTerminate: release,
    onPanResponderMove: (_event, { dx }) =>
      moveResize(latest, startingWidth, dx),
  });
}
