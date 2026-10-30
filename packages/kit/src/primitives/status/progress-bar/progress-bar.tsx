import { progressBarDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement, ComponentProps } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { cn } from '../../../utils';
import { progressColors } from './progress-bar-colors';
import {
  useProgressFillStyle,
  useProgressFillWidth,
  type ProgressFillWidth,
} from './progress-bar-fill';
import type { ProgressBarProps } from './progress-bar-props';
import { ProgressSweep } from './progress-bar-sweep';

const percent = 100;

function partTestID(
  testID: string | undefined,
  part: string,
): string | undefined {
  return testID ? `${testID}-${part}` : undefined;
}

type FillProps = ProgressBarProps & { fill: ProgressFillWidth };

function sweepProps(
  props: FillProps,
): React.ComponentProps<typeof ProgressSweep> {
  return {
    active: props.active,
    fillWidth: props.fill.fillWidth,
    testID: partTestID(props.testID, 'sweep'),
  };
}

function Fill(props: FillProps): ReactElement {
  const style = useProgressFillStyle(props.fill.fillWidth);

  const className = cn(
    'h-full overflow-hidden',
    progressColors[props.tone ?? progressBarDefaults.tone].fill,
    props.track === 'hairline' && 'rounded-full',
  );

  return (
    <Animated.View style={style} className={className}>
      <ProgressSweep {...sweepProps(props)} />
    </Animated.View>
  );
}

function progressAccessibility(
  props: ProgressBarProps,
  value: number,
): ComponentProps<typeof View> {
  const now = Math.round(value * percent);

  return {
    role: 'progressbar',
    accessibilityLabel: props.accessibilityLabel,
    'aria-valuemin': 0,
    'aria-valuemax': percent,
    'aria-valuenow': props.indeterminate ? undefined : now,
    accessibilityValue: accessibleValue(props.indeterminate, now),
  };
}

function trackProps(
  props: ProgressBarProps,
  value: number,
): ComponentProps<typeof View> {
  return {
    ...progressAccessibility(props, value),
    testID: partTestID(props.testID, 'bar'),
    className: cn(
      'h-0.75 w-full overflow-hidden wide-type:h-0.5',
      trackColor(props),
    ),
  };
}

function trackColor({ track, tone }: ProgressBarProps): string {
  return track === 'hairline'
    ? 'rounded-full bg-hairline'
    : progressColors[tone ?? progressBarDefaults.tone].track;
}

function clampedValue(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function ProgressBar(props: ProgressBarProps): ReactElement {
  const value = clampedValue(props.value);
  const fill = useProgressFillWidth(value);

  return (
    <View {...trackProps(props, value)} onLayout={fill.measure}>
      <Fill {...props} fill={fill} />
    </View>
  );
}

function accessibleValue(
  indeterminate: boolean | undefined,
  now: number,
): ComponentProps<typeof View>['accessibilityValue'] {
  return indeterminate ? undefined : { min: 0, max: percent, now };
}
