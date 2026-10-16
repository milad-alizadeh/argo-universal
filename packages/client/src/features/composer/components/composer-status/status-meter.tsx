import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { contextZone, fullPercent, smartZonePercent } from '../../state/status';

export const successBackgroundClassName = 'bg-success';

export const warningBackgroundClassName = 'bg-warning';

interface MeterProps {
  percent: number;
  warning?: boolean;
  className?: string;
}

function MeterFill({ percent, warning }: MeterProps): JSX.Element {
  const zoneColor =
    contextZone(percent) === 'smart'
      ? successBackgroundClassName
      : warningBackgroundClassName;

  return (
    <View
      className={cn('h-full rounded-full bg-foreground', warning && zoneColor)}
      style={{ width: `${Math.max(0, Math.min(fullPercent, percent))}%` }}
    />
  );
}

// The track and the smart-zone tick tint the foreground, so they show on a card, on the page surface and in dark mode alike.
const trackClassName = 'h-1.5 rounded-full bg-foreground/10 overflow-hidden';

export function Meter(props: MeterProps): JSX.Element {
  const { percent, warning = false, className } = props;

  return (
    <View
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={fullPercent}
      aria-valuenow={percent}
      className={cn(trackClassName, className)}
    >
      <MeterFill percent={percent} warning={warning} />
      {warning && <SmartZoneBoundary />}
    </View>
  );
}

function SmartZoneBoundary(): JSX.Element {
  return (
    <View
      className="absolute top-0 bottom-0 w-0.5 bg-foreground/30"
      style={{ left: `${smartZonePercent}%` }}
    />
  );
}
