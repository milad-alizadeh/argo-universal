import type { SessionStatus } from '@repo/contracts';
import { Portal } from '@rn-primitives/portal';
import type * as React from 'react';
import { View } from 'react-native';
import { formatElapsed } from '#lib/generic/format-elapsed';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';
import { useClock } from '#lib/generic/use-clock';
import { cn } from '#lib/generic/utils';
import { HeaderButton } from '#lib/product/header-button';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { StatusIndicator, statusLabels } from '#lib/product/status-indicator';
import { Icon } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';

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
      <Text role="badge" className={cn(statusTextColor[status])}>
        {statusLabels[status]}
      </Text>
      {startedAt !== null && (
        <Text role="secondary">for {formatElapsed(clock - startedAt)}</Text>
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
            semanticRole="heading"
            aria-level={2}
            numberOfLines={1}
            role={'heading'}
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
