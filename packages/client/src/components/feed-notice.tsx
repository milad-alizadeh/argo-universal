import type {
  CompactionUpdate,
  Notice,
  UnsupportedContent,
} from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/icon-names';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { ShimmerText } from './shimmer-text';

const noticeAppearance = new Map<string, { icon: IconName; color: string }>([
  ['info', { icon: 'info', color: 'text-muted-foreground' }],
  ['warning', { icon: 'warning', color: 'text-warning' }],
  ['error', { icon: 'failed', color: 'text-destructive' }],
]);
const unrecognisedAppearance = {
  icon: 'question' as const,
  color: 'text-muted-foreground',
};

interface NoticeMessageProps {
  severity: string;
  title: string;
  description?: string;
  excerpt?: string;
  // Replaces the severity's icon, for status rows such as Compaction.
  icon?: IconName;
  // Shimmers the title while the work it names runs.
  live?: boolean;
}

function NoticeMessage({
  severity,
  title,
  description,
  excerpt,
  icon,
  live = false,
}: NoticeMessageProps): React.JSX.Element {
  const appearance = noticeAppearance.get(severity) ?? unrecognisedAppearance;
  return (
    <View
      role={severity === 'error' ? 'alert' : 'status'}
      accessibilityLabel={`${severity}: ${title}`}
      className="min-h-5 flex-row items-start gap-1.5"
    >
      <View className="h-5 w-icon-md shrink-0 items-center justify-center">
        <Icon name={icon ?? appearance.icon} className={appearance.color} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        {live ? (
          <ShimmerText text={title} className="font-sans text-sm leading-5.5" />
        ) : (
          <Text
            numberOfLines={1}
            className={cn('font-sans text-sm leading-5.5', appearance.color)}
          >
            {title}
          </Text>
        )}
        {!!description && (
          <Text className="font-sans text-sm leading-5.5 text-muted-foreground">
            {description}
          </Text>
        )}
        {!!excerpt && (
          <Text
            selectable
            numberOfLines={1}
            className="font-mono text-xs leading-5 text-muted-foreground"
          >
            {excerpt}
          </Text>
        )}
      </View>
    </View>
  );
}

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

// A Notice or a Compaction: one status row, never opened.
export function FeedNotice({
  row,
}: {
  row: Notice | CompactionUpdate;
}): React.JSX.Element {
  if (row.sessionUpdate === 'compaction_update')
    return <NoticeMessage {...compactionNotice(row)} />;
  return (
    <NoticeMessage
      severity={row.severity}
      title={row.title}
      description={row.description}
      excerpt={
        noticeAppearance.has(row.severity)
          ? undefined
          : `Unknown severity: ${row.severity}`
      }
    />
  );
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
