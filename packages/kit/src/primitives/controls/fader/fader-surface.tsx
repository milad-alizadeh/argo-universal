import type { ReactElement } from 'react';
import { View, type ViewStyle } from 'react-native';
import { cn } from '#kit/utils';
import { Adjustable } from './fader-adjustable';
import { Gradient } from './fader-gradient';
import { fractionOf } from './fader-math';
import type { FaderProps } from './fader-props';
import type { FaderValue } from './fader-value';

type Orientation = NonNullable<FaderProps['orientation']>;

// The unfilled part is the fill's first colour at this opacity.
const unfilledOpacity = 0.18;

const fullPercent = 100;

const percent = (share: number): `${number}%` => `${share * fullPercent}%`;

const tint = (fill: readonly string[]): ViewStyle => ({
  backgroundColor: fill[0],
  opacity: unfilledOpacity,
});

const fillBox = (orientation: Orientation, share: number): ViewStyle =>
  orientation === 'vertical'
    ? { left: 0, right: 0, bottom: 0, height: percent(share) }
    : { top: 0, bottom: 0, start: 0, width: percent(share) };

// Without colours the unfilled part is the muted surface.
function Unfilled(props: Pick<FaderProps, 'fill'>): ReactElement {
  return (
    <View
      className={cn('absolute inset-0', !props.fill && 'bg-muted')}
      style={props.fill && tint(props.fill)}
    />
  );
}

interface FillProps extends Pick<FaderProps, 'fill'> {
  orientation: Orientation;
  share: number;
}

// Without colours the fill is the accent tone.
function Fill(props: FillProps): ReactElement {
  return (
    <View
      pointerEvents="none"
      className={cn('absolute', !props.fill && 'bg-accent')}
      style={fillBox(props.orientation, props.share)}
    >
      {props.fill ? (
        <Gradient fill={props.fill} orientation={props.orientation} />
      ) : null}
    </View>
  );
}

export type SurfaceProps = FaderProps & {
  orientation: Orientation;
  control: FaderValue;
};

// The unfilled part, the fill and the adjustable element, behind the content.
export function Surface(props: SurfaceProps): ReactElement {
  const share = fractionOf(props.control.value, props);

  return (
    <View className="absolute inset-0">
      <Unfilled fill={props.fill} />
      <Fill fill={props.fill} orientation={props.orientation} share={share} />
      <Adjustable {...props} />
    </View>
  );
}
