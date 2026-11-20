import type { ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#kit/utils';
import { Content } from './fader-content';
import { useFader } from './fader-frame';
import type { FaderProps } from './fader-props';
import { Surface } from './fader-surface';

export type { FaderProps } from './fader-props';

type Orientation = NonNullable<FaderProps['orientation']>;

// A vertical Fader alone in a Grid cell is as tall as a tile of lights; a horizontal one is a short bar.
const minHeights = {
  vertical: { minHeight: 232 },
  horizontal: { minHeight: 64 },
} as const satisfies Record<Orientation, ViewProps['style']>;

// The page may still scroll across the axis a drag moves along.
const touchClass = {
  vertical: 'web:touch-pan-x',
  horizontal: 'web:touch-pan-y',
} as const satisfies Record<Orientation, string>;

const frameClass = (props: FaderProps, orientation: Orientation): string =>
  cn(
    'w-full flex-1 overflow-hidden rounded-2xl bg-card',
    touchClass[orientation],
    props.disabled && 'opacity-50',
  );

/*
 * A plain React Native view, so it is the same on iOS, Android and the web: a rounded surface that fills from the
 * bottom (vertical) or the leading edge (horizontal) to its value, with its children over the fill in the ink the
 * fill's lightness calls for (the Text inside reads it from TextClassContext). The surface is one adjustable
 * element behind the children, which stay elements of their own.
 */
export function Fader(props: FaderProps): ReactElement {
  const { orientation, control, frame } = useFader(props);

  return (
    <View
      {...frame}
      style={minHeights[orientation]}
      className={frameClass(props, orientation)}
    >
      <Surface {...props} orientation={orientation} control={control} />
      <Content {...props} orientation={orientation} shown={control.value} />
    </View>
  );
}

Fader satisfies React.ComponentType<FaderProps>;
