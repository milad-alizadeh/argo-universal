import type { JSX } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { contextZone, fullPercent, smartZonePercent } from '../../utils/status';

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

export function Meter(props: MeterProps): JSX.Element {
  const { percent, warning = false, className } = props;

  return (
    <View
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={fullPercent}
      aria-valuenow={percent}
      className={cn('h-1.5 rounded-full bg-muted overflow-hidden', className)}
    >
      <MeterFill percent={percent} warning={warning} />
      {warning && <SmartZoneBoundary />}
    </View>
  );
}

function SmartZoneBoundary(): JSX.Element {
  return (
    <View
      className="absolute top-0 bottom-0 w-0.5 bg-card"
      style={{ left: `${smartZonePercent}%` }}
    />
  );
}
