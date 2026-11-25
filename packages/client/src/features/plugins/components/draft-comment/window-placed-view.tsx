import { useLayoutEffect, useRef } from 'react';
import type * as React from 'react';
import { View, type ViewProps, type ViewStyle } from 'react-native';

type PlacedProps = Omit<ViewProps, 'style'> & {
  className?: string;
  // Where the window says the mark is, as `left` and `top` of a `fixed` view; none lays it as its className says.
  style?: ViewStyle;
};

/*
 * A `fixed` mark is placed in the window, but inside a part of a list that contains its layout (`contain`, as a
 * list row does) fixed lays against that part instead. The mark is measured where it landed and moved by what it
 * missed by, so it sits where the window says whichever box holds it.
 */
export function WindowPlacedView({
  style,
  ...props
}: PlacedProps): React.JSX.Element {
  const ref = useRef<React.ComponentRef<typeof View>>(null);

  useLayoutEffect(() => {
    const element = ref.current;

    if (!style || !(element instanceof HTMLElement)) return;

    element.style.translate = 'none';

    const landed = element.getBoundingClientRect();

    element.style.translate = `${Number(style.left) - landed.left}px ${Number(style.top) - landed.top}px`;
  });

  return <View ref={ref} style={style} {...props} />;
}
