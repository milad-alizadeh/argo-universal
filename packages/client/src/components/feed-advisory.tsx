import type { CompactionUpdate } from '@repo/contracts';
import { ArrowsInLineVerticalIcon, XCircleIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/collapsible';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';
import { DisclosureCaret } from './disclosure-caret';
import { FeedContent } from './feed-content';
import { ShimmerText } from './shimmer-text';

const compactionLabels = new Map(
  Object.entries({
    in_progress: 'Compacting context',
    completed: 'Context compacted',
    failed: "Couldn't compact context",
    cancelled: 'Compaction stopped',
  }),
);

export function FeedCompaction({
  row,
}: {
  row: CompactionUpdate;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const label =
    compactionLabels.get(row.status) ??
    `Unknown compaction status: ${row.status}`;
  const hasDetails = !!row.summary?.length || !!row.error;
  const heading = (
    <CompactionHeading
      label={label}
      status={row.status}
      expanded={hasDetails ? open : undefined}
    />
  );
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      {hasDetails ? (
        <CollapsibleTrigger accessibilityLabel={label} className="w-full">
          {heading}
        </CollapsibleTrigger>
      ) : (
        heading
      )}
      {hasDetails && (
        <CollapsibleContent className="pt-2 pb-1">
          <View className="gap-1 rounded-xl border border-border bg-sidebar px-4 py-3">
            {!!row.summary?.length && (
              <>
                <Text className="text-sm leading-5.5 text-muted-foreground">
                  Summary
                </Text>
                <FeedContent content={row.summary} textVariant="summary" />
              </>
            )}
            {!!row.error && (
              <Text className="text-sm leading-5.5 text-muted-foreground">
                {row.error}
              </Text>
            )}
          </View>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

function CompactionHeading({
  label,
  status,
  expanded,
}: {
  label: string;
  status: string;
  expanded?: boolean;
}): React.JSX.Element {
  return (
    <View
      role="status"
      accessibilityLabel={label}
      className="w-full flex-row items-center gap-1.5"
    >
      <View className="h-px min-w-2 flex-1 bg-border" />
      <Icon
        as={status === 'failed' ? XCircleIcon : ArrowsInLineVerticalIcon}
        className={
          status === 'failed' ? 'text-destructive' : 'text-muted-foreground'
        }
      />
      {status === 'in_progress' ? (
        <ShimmerText
          text={label}
          className="text-sm leading-5.5 text-foreground"
        />
      ) : (
        <Text
          numberOfLines={1}
          className={cn(
            'shrink text-sm leading-5.5 text-muted-foreground',
            status === 'failed' && 'text-destructive',
          )}
        >
          {label}
        </Text>
      )}
      {expanded !== undefined && (
        <DisclosureCaret
          open={expanded}
          className="-ml-0.5 text-muted-foreground"
        />
      )}
      <View className="h-px min-w-2 flex-1 bg-border" />
    </View>
  );
}
