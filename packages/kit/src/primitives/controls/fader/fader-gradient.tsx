import { useId, type ReactElement } from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { isRightToLeft } from './fader-direction';
import type { FaderProps } from './fader-props';

type Orientation = NonNullable<FaderProps['orientation']>;

interface GradientProps {
  fill: NonNullable<FaderProps['fill']>;
  orientation: Orientation;
}

// A gradient runs from the bottom up, or from the leading edge.
const bottomUp = { x1: 0, y1: 1, x2: 0, y2: 0 };

const fromLeft = { x1: 0, y1: 0, x2: 1, y2: 0 };

const fromRight = { x1: 1, y1: 0, x2: 0, y2: 0 };

function vectorOf(orientation: Orientation): typeof bottomUp {
  if (orientation === 'vertical') return bottomUp;

  return isRightToLeft() ? fromRight : fromLeft;
}

// A gradient needs two stops, so a single colour is given twice.
const twoStops = (fill: GradientProps['fill']): string[] =>
  fill.length === 1 ? [...fill, ...fill] : fill;

function Ramp(props: GradientProps & { id: string }): ReactElement {
  const stops = twoStops(props.fill);

  return (
    <LinearGradient id={props.id} {...vectorOf(props.orientation)}>
      {stops.map((colour, index) => (
        <Stop
          key={`${colour}-${String(index)}`}
          offset={index / (stops.length - 1)}
          stopColor={colour}
        />
      ))}
    </LinearGradient>
  );
}

// An id that a `url(#…)` reference can hold.
const useGradientId = (): string =>
  `fader-${useId().replaceAll(/[^A-Za-z0-9]/gu, '')}`;

// The fill's colours, stretched over whatever box the fill takes, on every platform.
export function Gradient(props: GradientProps): ReactElement {
  const id = useGradientId();

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <Ramp {...props} id={id} />
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
