import type { SessionStatus } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { formatElapsed } from '#lib/generic/format-elapsed';
import { Text } from '#lib/generic/primitives/text';
import { useClock } from '#lib/generic/use-clock';
import { cn } from '#lib/generic/utils';
import { HeaderButton } from '#lib/product/header-button';
import { useInspector } from '#lib/product/inspector';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { PageHeader } from '#lib/product/page-header';
import { StatusIndicator, statusLabels } from '#lib/product/status-indicator';
import { IconButton } from '../../../lib/generic/primitives/icon-button';
import { useWide } from '../../../lib/generic/use-wide';
import { type MergeMethod, MergePrButton } from './merge-pr-button';
import { PullRequestChecks } from './pull-request-checks';
import {
  MorePullRequests,
  type SessionPullRequest,
  SessionPullRequestLabel,
} from './session-pull-request';

export type SessionHeaderStatus = Extract<
  SessionStatus,
  'running' | 'needs_input' | 'idle'
>;

export interface SessionHeaderProps {
  title: string;
  status: SessionHeaderStatus;
  // The running Turn's start, for "4m 12s"; null when no Turn runs.
  startedAt: number | null;
  // The Session's PRs; the header shows one and lists the rest in a menu.
  pullRequests?: SessionPullRequest[];
  // Absent while the Server cannot merge a PR; Merge PR then stays dimmed.
  onMerge?: (pullRequest: number, method: MergeMethod) => void;
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
    <>
      <Text role="secondary" className={cn(statusTextColor[status])}>
        {statusLabels[status]}
      </Text>
      <StatusIndicator
        status={status}
        size="small"
        className="size-1.5 border-0"
        testID="session-status"
      />
      {startedAt !== null && (
        <Text role="secondary" className="text-muted-foreground">
          {formatElapsed(clock - startedAt)}
        </Text>
      )}
    </>
  );
}

// The gap between the status, the PR and its checks on the meta line.
function MetaGap(): React.JSX.Element {
  return <View className="w-2.5 shrink-0" />;
}

function PullRequestMeta({
  pullRequests,
  shown,
  onShow,
}: {
  pullRequests: SessionPullRequest[];
  shown: SessionPullRequest;
  onShow: (number: number) => void;
}): React.JSX.Element {
  return (
    <>
      <MetaGap />
      <SessionPullRequestLabel {...shown} />
      {pullRequests.length > 1 && (
        <MorePullRequests
          pullRequests={pullRequests}
          shown={shown.number}
          onShow={onShow}
        />
      )}
      {shown.checks && (
        <>
          <MetaGap />
          <PullRequestChecks {...shown.checks} />
        </>
      )}
    </>
  );
}

// The PR the header shows: the first one until the "+n PR" menu picks another.
function useShownPullRequest(
  pullRequests: SessionPullRequest[],
): [SessionPullRequest | undefined, (number: number) => void] {
  const [picked, setPicked] = useState<number>();
  const shown =
    pullRequests.find((pullRequest) => pullRequest.number === picked) ??
    pullRequests.at(0);
  return [shown, setPicked];
}

function PhoneSessionHeader({ title }: { title: string }): React.JSX.Element {
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
}

// A phone gets the native stack's own header: the plain title, its back button, and two right items. Wide draws its PageHeader with a one-line title, the meta line (status, one PR, its checks) and the actions.
export function SessionHeader({
  title,
  status,
  startedAt,
  pullRequests = [],
  onMerge,
  now,
}: SessionHeaderProps): React.JSX.Element {
  const wide = useWide();
  const [shown, show] = useShownPullRequest(pullRequests);
  const inspector = useInspector();
  if (!wide) return <PhoneSessionHeader title={title} />;
  return (
    <PageHeader
      title={
        <View className="min-w-0 gap-0.5">
          {/* A long title stops at two thirds of the row, well clear of the actions. */}
          <View className="max-w-[66%]">
            <Text
              semanticRole="heading"
              aria-level={2}
              numberOfLines={1}
              role={'heading'}
            >
              {title}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <StatusLine status={status} startedAt={startedAt} now={now} />
            {shown && (
              <PullRequestMeta
                pullRequests={pullRequests}
                shown={shown}
                onShow={show}
              />
            )}
          </View>
        </View>
      }
      actions={
        <View className="-mt-1 flex-row items-center gap-3">
          {shown && (
            <MergePrButton
              mergeable={shown.mergeable}
              onMerge={onMerge && ((method) => onMerge(shown.number, method))}
            />
          )}
          <IconButton
            variant="ghost"
            size="sm"
            accessibilityLabel="Changes"
            aria-expanded={inspector?.open ?? false}
            onPress={inspector?.toggle}
            icon="diff"
            iconSize="md"
            className="bg-foreground/7"
            iconClassName="text-foreground"
          />
          {/* The Session menu gets its actions in a later issue. */}
          <IconButton
            variant="ghost"
            size="sm"
            accessibilityLabel="More"
            icon="more"
            iconSize="md"
            iconClassName="text-foreground"
          />
        </View>
      }
    />
  );
}
