import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { smartZonePercent } from '../../utils/status';
import {
  successBackgroundClassName,
  warningBackgroundClassName,
} from './status-meter';
import { StatusText } from './status-text';

const zones = [
  {
    label: `Smart zone · below ${smartZonePercent}%`,
    explanation: 'Focused context helps the Agent follow instructions.',
    color: successBackgroundClassName,
  },
  {
    label: `Dumb zone · ${smartZonePercent}% and up`,
    explanation: 'Extra history can distract the Agent, even with space left.',
    color: warningBackgroundClassName,
  },
];

interface ContextZoneProps {
  zone: (typeof zones)[number];
}

function ContextZoneCopy({ zone }: ContextZoneProps): JSX.Element {
  return (
    <View className="flex-1 gap-0.5">
      <StatusText role="secondary" className="select-none text-foreground">
        {zone.label}
      </StatusText>
      <StatusText role="secondary" className="select-none">
        {zone.explanation}
      </StatusText>
    </View>
  );
}

function ContextZoneRow({ zone }: ContextZoneProps): JSX.Element {
  return (
    <View className="flex-row gap-2">
      <View className={cn('size-2 mt-1.25 rounded-full', zone.color)} />
      <ContextZoneCopy zone={zone} />
    </View>
  );
}

export function ContextZones(): JSX.Element {
  return (
    <View className="px-0 pt-3 gap-2">
      {zones.map((zone) => (
        <ContextZoneRow key={zone.label} zone={zone} />
      ))}
    </View>
  );
}
