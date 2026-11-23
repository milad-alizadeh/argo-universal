import {
  type CompactionUpdate,
  type Notice,
  runningCompactionStatus,
  type UnsupportedContent,
} from '@repo/contracts';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import {
  isKnownSeverity,
  NoticeMessage,
  type NoticeMessageProps,
} from './notice-message';
import { QuietFeedRow } from './quiet-feed-row';

const compactionNotices = new Map<string, NoticeMessageProps>([
  [
    runningCompactionStatus,
    {
      severity: 'info',
      title: 'Compacting',
      icon: 'compaction',
      live: true,
    },
  ],
  [
    'completed',
    { severity: 'info', title: 'Context compacted', icon: 'compaction' },
  ],
  ['failed', { severity: 'error', title: "Couldn't compact context" }],
  [
    'cancelled',
    { severity: 'info', title: 'Compaction stopped', icon: 'compaction' },
  ],
]);

function compactionNotice(row: CompactionUpdate): NoticeMessageProps {
  const notice = compactionNotices.get(row.status);

  if (!notice)
    return {
      severity: 'unrecognised',
      title: `Unknown compaction status: ${row.status}`,
    };

  return row.error ? { ...notice, description: row.error } : notice;
}

const noticeProps = (row: Notice): NoticeMessageProps => ({
  severity: row.severity,
  title: row.title,
  description: row.description,
  markdownDescription: row.severity === 'warning',
  excerpt: isKnownSeverity(row.severity)
    ? undefined
    : `Unknown severity: ${row.severity}`,
});

export interface FeedNoticeProps {
  // The recorded row: a Notice's own severity and words, or a Compaction's status.
  row: Notice | CompactionUpdate;
}

// A Notice or a Compaction: one status row, never opened.
export function FeedNotice({ row }: FeedNoticeProps): React.JSX.Element {
  const skip =
    row.sessionUpdate === 'notice' && row._meta?.argo?.skippedSchedule;

  if (skip) {
    const day = new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      timeZone: skip.timeZone,
    }).format(skip.at);

    const at = new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: skip.timeZone,
    }).format(skip.at);

    const reason =
      skip.reason === 'offline'
        ? 'the Server was offline for more than an hour'
        : 'the previous run was still waiting';

    return (
      <QuietFeedRow>
        <Text tone="muted">
          Skipped {day} {at} · {reason}
        </Text>
      </QuietFeedRow>
    );
  }

  const props =
    row.sessionUpdate === 'compaction_update'
      ? compactionNotice(row)
      : noticeProps(row);

  return <NoticeMessage {...props} />;
}

export function UnsupportedFeedContent({
  block,
}: {
  block: UnsupportedContent;
}): React.JSX.Element {
  return (
    <NoticeMessage
      severity="unrecognised"
      title={`Unsupported ${block.contentKind} content`}
      description={block.reason}
      excerpt={block.reference}
    />
  );
}
