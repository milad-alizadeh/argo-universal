import type { JSX } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { IconSlot } from '#primitives/display/icon/icon';
import { contextZone, fullPercent } from '../../state/status';
import {
  successBackgroundClassName,
  warningBackgroundClassName,
} from './status-meter';

const contextRingRadius = 5.5;

const circumference = 2 * Math.PI * contextRingRadius;

const circleProps = {
  cx: 7,
  cy: 7,
  r: contextRingRadius,
  fill: 'none',
  strokeWidth: 2,
};

const ThemedCircle = withUniwind(Circle, {
  stroke: {
    fromClassName: 'strokeClassName',
    styleProperty: 'backgroundColor',
  },
});

function RemainingContextArc({ percent }: { percent: number }): JSX.Element {
  const strokeClassName =
    contextZone(percent) === 'smart'
      ? successBackgroundClassName
      : warningBackgroundClassName;

  const strokeDasharray = `${(circumference * Math.max(0, Math.min(fullPercent, fullPercent - percent))) / fullPercent} ${circumference}`;

  const arcProps = {
    strokeClassName,
    strokeDasharray,
    strokeLinecap: 'round',
    transform: 'rotate(-90 7 7)',
  } as const;

  return <ThemedCircle {...circleProps} {...arcProps} />;
}

export function ContextRing({ percent }: { percent: number }): JSX.Element {
  return (
    <IconSlot role="mark">
      <View className="h-full w-full">
        <Svg width="100%" height="100%" viewBox="0 0 14 14">
          <ThemedCircle {...circleProps} strokeClassName="bg-border" />
          <RemainingContextArc percent={percent} />
        </Svg>
      </View>
    </IconSlot>
  );
}
