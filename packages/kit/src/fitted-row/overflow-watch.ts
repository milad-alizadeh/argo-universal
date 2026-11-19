import { useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

// Widths below half a point are rounding, not overflow.
const overflowTolerance = 0.5;

interface Room {
  available?: number;
  natural?: number;
}

const overflows = ({ available, natural }: Room): boolean =>
  available !== undefined &&
  natural !== undefined &&
  natural > available + overflowTolerance;

const widthOf = (event: LayoutChangeEvent): number =>
  event.nativeEvent.layout.width;

interface OverflowWatch {
  // Once true, stays true: a line that has overflowed fits its items from then on.
  overflowed: boolean;
  // The layout of the room the items have.
  onRoom: (event: LayoutChangeEvent) => void;
  // The layout of the items drawn whole, side by side.
  onItems: (event: LayoutChangeEvent) => void;
}

// Whether a line's items, drawn whole, have ever been wider than its room.
export function useOverflowWatch(): OverflowWatch {
  const [room, setRoom] = useState<Room>({});
  const [overflowed, setOverflowed] = useState(false);

  if (!overflowed && overflows(room)) setOverflowed(true);

  return {
    overflowed,
    onRoom: (event) =>
      setRoom((current) => ({ ...current, available: widthOf(event) })),
    onItems: (event) =>
      setRoom((current) => ({ ...current, natural: widthOf(event) })),
  };
}
