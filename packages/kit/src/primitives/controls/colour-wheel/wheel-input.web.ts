import { useRef } from 'react';
import type { PointerEvent, ViewProps } from 'react-native';
import type { PickPoint } from './wheel-input';

function pickAt(event: PointerEvent, pick: PickPoint): void {
  const { currentTarget, nativeEvent } = event;

  if (!(currentTarget instanceof HTMLElement)) return;

  const bounds = currentTarget.getBoundingClientRect();

  pick(nativeEvent.clientX - bounds.left, nativeEvent.clientY - bounds.top);
}

export function useWheelInput(disabled: boolean, pick: PickPoint): ViewProps {
  const pointer = useRef<number | null>(null);

  return {
    onPointerDown: (event) => {
      if (disabled || !(event.currentTarget instanceof HTMLElement)) return;

      pointer.current = event.nativeEvent.pointerId;
      event.currentTarget.setPointerCapture(pointer.current);
      pickAt(event, pick);
    },
    onPointerMove: (event) => {
      if (!disabled && pointer.current === event.nativeEvent.pointerId)
        pickAt(event, pick);
    },
    onPointerUp: () => {
      pointer.current = null;
    },
    onPointerCancel: () => {
      pointer.current = null;
    },
  };
}
