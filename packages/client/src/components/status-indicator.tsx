import type { SessionInfo } from '@repo/contracts';
import { View } from 'react-native';
import { cn } from '#lib/utils';
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
  failed: 'bg-destructive',
  unread: 'bg-info',
  idle: 'bg-muted-foreground',
} satisfies Record<SessionInfo['status'], string>;

export interface StatusIndicatorProps {
  status: SessionInfo['status'];
  size?: 'default' | 'small';
  className?: string;
  testID?: string;
}

export function StatusIndicator({
  status,
  size = 'default',
  className,
  testID = 'status-indicator',
}: StatusIndicatorProps) {
  const active = status === 'running' || status === 'needs_input';
  return (
    <View
      testID={`${testID}-container`}
      accessibilityLabel={statusLabels[status]}
      className={cn(
        'shrink-0 rounded-full border-2 border-background bg-background',
        size === 'small' ? 'size-2' : 'size-2.5',
        className,
      )}
    >
      <BlinkingDot
        testID={testID}
        colorClassName={statusColors[status]}
        blinking={active}
        className="size-full"
      />
    </View>
  );
}
