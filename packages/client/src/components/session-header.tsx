import type { SessionStatus } from '@repo/contracts';
import { Portal } from '@rn-primitives/portal';
import type * as React from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';
import { formatElapsed } from '../feed/format-elapsed';
import { useClock } from '../feed/use-clock';
import { Icon } from '../lib/icon';
import { ScreenHeader } from '../navigation/screen-header';
import { useWide } from '../navigation/use-wide';
import { HeaderButton } from './header-button';
import { StatusIndicator, statusLabels } from './status-indicator';

// The wide shell's detail header slots, filled by the open Session's header.
export const detailHeaderHost = 'detail-header';
export const detailActionsHost = 'detail-actions';

export type SessionHeaderStatus = Extract<
  SessionStatus,
  'running' | 'needs_input' | 'idle'
>;

export interface SessionHeaderProps {
  title: string;
  status: SessionHeaderStatus;
  // The running Turn's start, for "for 4m 12s"; null when no Turn runs.
  startedAt: number | null;
  // Fixes the clock, for stories and tests.
  now?: number;
}

const statusTextColor = {
  running: 'text-success',
  needs_input: 'text-warning',
  idle: 'text-muted-foreground',
} satisfies Record<SessionHeaderStatus, string>;

function StatusLine({
  status,
  startedAt,
  now,
}: Pick<
  SessionHeaderProps,
  'status' | 'startedAt' | 'now'
>): React.JSX.Element {
  const clock = useClock(startedAt !== null, now);
  return (
    <View className="flex-row items-center gap-1">
      <View className="size-2 items-center justify-center">
        <StatusIndicator status={status} size="small" testID="session-status" />
      </View>
      <Text className={cn('text-xs font-medium', statusTextColor[status])}>
        {statusLabels[status]}
      </Text>
      {startedAt !== null && (
        <Text className="text-xs text-muted-foreground">
          for {formatElapsed(clock - startedAt)}
        </Text>
      )}
    </View>
  );
}

// A phone gets the native stack's own header: the plain title, its back button, and two right items. Wide fills the shell's detail header with the title and status.
export function SessionHeader({
  title,
  status,
  startedAt,
  now,
}: SessionHeaderProps): React.JSX.Element {
  const wide = useWide();
  if (!wide)
    return (
      <ScreenHeader
        title={title}
        right={[
          // Changed files and the Session menu get their actions in later issues.
          <HeaderButton
            key="changes"
            icon="pull-request"
            paired
            accessibilityLabel="Changes"
          />,
          <HeaderButton
            key="more"
            icon="more"
            paired
            accessibilityLabel="More"
          />,
        ]}
      />
    );
  return (
    <>
      <Portal name="session-header" hostName={detailHeaderHost}>
        <View className="min-w-0 gap-0.5">
          <Text
            role="heading"
            aria-level={2}
            numberOfLines={1}
            className="text-base font-semibold"
          >
            {title}
          </Text>
          <StatusLine status={status} startedAt={startedAt} now={now} />
        </View>
      </Portal>
      <Portal name="session-actions" hostName={detailActionsHost}>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 sm:size-8"
          accessibilityLabel="More"
        >
          <Icon name="more" className="text-foreground" />
        </Button>
      </Portal>
    </>
  );
}
