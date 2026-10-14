import type { SessionInfo } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { BlinkingDot } from './blinking-dot';

export const statusLabels = {
  needs_input: 'Needs input',
  running: 'Running',
  failed: 'Failed',
  unread: 'Unread',
  idle: 'Idle',
} satisfies Record<SessionInfo['status'], string>;

const statusColors = {
  needs_input: 'bg-warning',
  running: 'bg-success',
  failed: 'bg-danger',
  unread: 'bg-info',
  idle: 'bg-muted-foreground',
} satisfies Record<SessionInfo['status'], string>;

export interface StatusIndicatorProps {
  status: SessionInfo['status'];
  size?: 'default' | 'small';
  className?: string;
  testID?: string;
}

const statusBlinks = {
  needs_input: true,
  running: true,
  failed: false,
  unread: false,
  idle: false,
} satisfies Record<SessionInfo['status'], boolean>;

const sizeClassNames = {
  default: 'size-2.5',
  small: 'size-2',
} satisfies Record<NonNullable<StatusIndicatorProps['size']>, string>;

export function StatusIndicator({
  testID = 'status-indicator',
  ...props
}: StatusIndicatorProps): React.JSX.Element {
  return (
    <View
      testID={`${testID}-container`}
      accessibilityLabel={statusLabels[props.status]}
      className={indicatorClassName(props)}
    >
      <StatusDot status={props.status} testID={testID} />
    </View>
  );
}

function indicatorClassName({
  size = 'default',
  className,
}: Omit<StatusIndicatorProps, 'testID'>): string {
  return cn(
    'shrink-0 rounded-full border-2 border-background bg-background',
    sizeClassNames[size],
    className,
  );
}

function StatusDot(props: {
  status: SessionInfo['status'];
  testID: string;
}): React.JSX.Element {
  return (
    <BlinkingDot
      testID={props.testID}
      colorClassName={statusColors[props.status]}
      blinking={statusBlinks[props.status]}
      className="size-full"
    />
  );
}
