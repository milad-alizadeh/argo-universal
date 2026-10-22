import { IconSlot } from '@repo/kit/primitives/content/icon';
import type { JSX } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { withUniwind } from 'uniwind';
import { contextZone, fullPercent } from '../../utils/status';
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

const remainingPercent = (percent: number): number =>
  Math.max(0, Math.min(fullPercent, fullPercent - percent));

function RemainingContextArc({ percent }: { percent: number }): JSX.Element {
  const strokeClassName =
    contextZone(percent) === 'smart'
      ? successBackgroundClassName
      : warningBackgroundClassName;

  const strokeDasharray = `${(circumference * remainingPercent(percent)) / fullPercent} ${circumference}`;

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
    <IconSlot size="sm">
      <View className="h-full w-full">
        <Svg width="100%" height="100%" viewBox="0 0 14 14">
          <ThemedCircle {...circleProps} strokeClassName="bg-border" />
          {/* A zero-length dash with a round cap still paints a dot, so a full window draws no arc. */}
          {remainingPercent(percent) > 0 && (
            <RemainingContextArc percent={percent} />
          )}
        </Svg>
      </View>
    </IconSlot>
  );
}
