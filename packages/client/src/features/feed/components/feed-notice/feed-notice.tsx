import type {
  CompactionUpdate,
  Notice,
  UnsupportedContent,
} from '@repo/contracts';
import type * as React from 'react';
import {
  isKnownSeverity,
  NoticeMessage,
  type NoticeMessageProps,
} from './notice-message';

const compactionNotices = new Map<string, NoticeMessageProps>([
  [
    'in_progress',
    {
      severity: 'info',
      title: 'Compacting context',
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
