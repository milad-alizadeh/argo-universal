import type { ReactElement } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#kit/utils';
import {
  SecondaryTextClassContext,
  TextClassContext,
} from '#primitives/content/text';
import { useFader } from './fader-frame';
import { inkOver, type Ink } from './fader-ink';
import type { FaderProps } from './fader-props';
import { Surface } from './fader-surface';

export type { FaderProps } from './fader-props';

type Orientation = NonNullable<FaderProps['orientation']>;

// A vertical Fader alone in a Grid cell is as tall as a tile of lights; a horizontal one is a short bar.
const minHeights = {
  vertical: { minHeight: 232 },
  horizontal: { minHeight: 64 },
} as const satisfies Record<Orientation, ViewProps['style']>;

// The content's children spread along the surface: a column from top to bottom, a row from the leading edge to the trailing one.
const contentClass = {
  vertical: 'flex-1 justify-between p-4',
  horizontal: 'flex-1 flex-row items-center justify-between gap-3 px-4',
} as const satisfies Record<Orientation, string>;

// The ink, and the same ink at reduced emphasis for the secondary role.
const inkClass = {
  dark: { text: 'text-ink-on-light', secondary: 'text-ink-on-light/70' },
  light: { text: 'text-ink-on-dark', secondary: 'text-ink-on-dark/70' },
} as const satisfies Record<Ink, { text: string; secondary: string }>;

const accentInk = {
  text: 'text-primary-foreground',
  secondary: 'text-primary-foreground/70',
};

// The ink over the fill, from its colours; over the accent tone, the one that pairs with it.
const inkOf = (fill: FaderProps['fill']): typeof accentInk =>
  fill ? inkClass[inkOver(fill)] : accentInk;

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

interface ContentProps extends Pick<FaderProps, 'fill' | 'children'> {
  orientation: Orientation;
}

function Content(props: ContentProps): ReactElement {
  const className = contentClass[props.orientation];
  const ink = inkOf(props.fill);

  return (
    <TextClassContext value={ink.text}>
      <SecondaryTextClassContext value={ink.secondary}>
        <View pointerEvents="box-none" className={className}>
          {props.children}
        </View>
      </SecondaryTextClassContext>
    </TextClassContext>
  );
}

/*
 * A plain React Native view, so it is the same on iOS, Android and the web: a rounded surface that fills from the
 * bottom (vertical) or the leading edge (horizontal) to its value, with its children over the fill in the ink the
 * fill's lightness calls for (the Text inside reads it from TextClassContext). The surface is one adjustable
 * element behind the children, which stay elements of their own.
 */
export function Fader(props: FaderProps): ReactElement {
  const { orientation, control, frame } = useFader(props);
  const style = minHeights[orientation];

  return (
    <View {...frame} style={style} className={frameClass(props, orientation)}>
      <Surface {...props} orientation={orientation} control={control} />
      <Content fill={props.fill} orientation={orientation}>
        {props.children}
      </Content>
    </View>
  );
}

Fader satisfies React.ComponentType<FaderProps>;
