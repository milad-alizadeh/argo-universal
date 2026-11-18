import { useSyncLayout } from '@legendapp/list/react-native';
import type { BlobRef } from '@repo/contracts';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleLayoutSyncContext,
} from '@repo/kit/primitives/layout/collapsible';
import type * as React from 'react';
import { memo, useEffect, useMemo } from 'react';
import { View, type ViewProps } from 'react-native';
import { SessionColumn } from '#lib/product/session-column';
import { FeedItem } from '../feed-item';
import { LiveHeader } from '../live-header/live-header';
import { type FeedEntry, type LiveHeaderEntry, entryKey } from './feed-entry';

export interface RowMotion {
  onMotionChange: (itemKey: string, moving: boolean) => void;
  onGrow: (itemKey: string, height: number) => void;
}

export interface EntryDrawing {
  imageUrl: (blob: BlobRef) => string;
  now?: number;
  // Opens a Subagent row's Feed, where the Session offers one.
  onOpenSubagent?: (subagentSessionId: string) => void;
}

interface FeedRowProps extends RowMotion, EntryDrawing {
  entry: FeedEntry;
  // The gap travels with the row data so the virtualized cell observes changes.
  spaceBelow: string;
  spaceBefore?: string;
  // So does whether the Agent is writing into this row.
  streaming: boolean;
}

type LayoutSync = NonNullable<
  React.ContextType<typeof CollapsibleLayoutSyncContext>
>;

function useLayoutSync(
  itemKey: string,
  { onMotionChange, onGrow }: RowMotion,
): LayoutSync {
  const syncLayout = useSyncLayout();

  return useMemo(
    (): LayoutSync => ({
      syncLayout,
      onMotionChange: (moving: boolean) => onMotionChange(itemKey, moving),
      grow: (height: number) => onGrow(itemKey, height),
    }),
    [syncLayout, onMotionChange, onGrow, itemKey],
  );
}

type LiveHeaderRowProps = Pick<FeedRowProps, 'now' | 'spaceBefore'> & {
  entry: LiveHeaderEntry;
};

function closeAtZero(onExit: LiveHeaderEntry['onExit']): ViewProps['onLayout'] {
  if (!onExit) return;

  return ({ nativeEvent }): void => {
    if (nativeEvent.layout.height === 0) onExit();
  };
}

function LiveHeaderRow({
  entry: { closing, onExit, liveHeader, toolCall },
  now,
  spaceBefore,
}: LiveHeaderRowProps): React.JSX.Element {
  // A reader can scroll the closing cell out of the list's render window before it reaches zero.
  useEffect(() => onExit, [onExit]);

  return (
    <Collapsible open={!closing} onLayout={closeAtZero(onExit)}>
      <CollapsibleContent>
        {spaceBefore && <View className={spaceBefore} />}
        <LiveHeader liveHeader={liveHeader} toolCall={toolCall} now={now} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function EntryContent(props: FeedRowProps): React.JSX.Element {
  const { entry, now, spaceBefore, streaming } = props;

  return entry.type === 'live_header' ? (
    <LiveHeaderRow entry={entry} now={now} spaceBefore={spaceBefore} />
  ) : (
    <FeedItem item={entry} {...props} streaming={streaming} />
  );
}

/*
 * A row's collapsibles resize it in the list each frame they move, so the rows below move in the
 * same frame. The list data keeps unchanged entries, their gap and streaming state, so a row draws
 * again only when one of those changes.
 */
export const FeedRow = memo(function FeedRow(props: FeedRowProps) {
  const { entry, spaceBelow } = props;
  const layoutSync = useLayoutSync(entryKey(entry), props);

  return (
    <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
      <SessionColumn testID="feed-column" className={spaceBelow}>
        <EntryContent {...props} />
      </SessionColumn>
    </CollapsibleLayoutSyncContext.Provider>
  );
});
