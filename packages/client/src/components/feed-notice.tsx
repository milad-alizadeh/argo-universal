import type { Notice, UnsupportedContent } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/icon-names';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';

const noticeAppearance = new Map<string, { icon: IconName; color: string }>([
  ['info', { icon: 'info', color: 'text-muted-foreground' }],
  ['warning', { icon: 'warning', color: 'text-warning' }],
  ['error', { icon: 'failed', color: 'text-destructive' }],
]);
const unrecognisedAppearance = {
  icon: 'question' as const,
  color: 'text-muted-foreground',
};

function NoticeMessage({
  severity,
  title,
  description,
  excerpt,
}: {
  severity: string;
  title: string;
  description?: string;
  excerpt?: string;
}): React.JSX.Element {
  const appearance = noticeAppearance.get(severity) ?? unrecognisedAppearance;
  return (
    <View
      role={severity === 'error' ? 'alert' : 'status'}
      accessibilityLabel={`${severity}: ${title}`}
      className="min-h-5 flex-row items-start gap-1.5"
    >
      <View className="h-5 w-icon-md shrink-0 items-center justify-center">
        <Icon name={appearance.icon} className={appearance.color} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          numberOfLines={1}
          className={cn('font-sans text-sm leading-5.5', appearance.color)}
        >
          {title}
        </Text>
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

export function FeedNotice({ row }: { row: Notice }): React.JSX.Element {
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
