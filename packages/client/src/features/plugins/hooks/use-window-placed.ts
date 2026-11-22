import { useLayoutEffect, useRef, useState } from 'react';
import type * as React from 'react';
import type { View, ViewStyle } from 'react-native';

type Holder = React.ComponentRef<typeof View>;

const none = { x: 0, y: 0 };

/*
 * A `fixed` mark is placed in the window, but inside a part of a list that contains its layout (`contain`, as a
 * list row does) fixed lays against that part instead. The mark is measured where it landed and shifted by what it
 * missed by, so it sits where the window says whichever box holds it.
 */
export function useWindowPlaced(
  style: ViewStyle | undefined,
): { ref: React.RefObject<Holder | null>; style: ViewStyle | undefined } {
  const ref = useRef<Holder>(null);
  const [shift, setShift] = useState(none);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!style || !(element instanceof Element)) return;

    const landed = element.getBoundingClientRect();
    const x = shift.x + Number(style.left) - landed.left;
    const y = shift.y + Number(style.top) - landed.top;

    if (Math.abs(x - shift.x) > 0.5 || Math.abs(y - shift.y) > 0.5)
      setShift({ x, y });
  });

  if (!style) return { ref, style };

  return {
    ref,
    style: {
      ...style,
      left: Number(style.left) + shift.x,
      top: Number(style.top) + shift.y,
    },
  };
}
