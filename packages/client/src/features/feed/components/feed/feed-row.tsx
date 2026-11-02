import { useSyncLayout } from '@legendapp/list/react-native';
import type { BlobRef } from '@repo/contracts';
import { CollapsibleLayoutSyncContext } from '@repo/kit/primitives/layout/collapsible';
import type * as React from 'react';
import { memo, useMemo } from 'react';
import { SessionColumn } from '#lib/product/session-column';
import { FeedItem } from '../feed-item';
import { LiveHeader } from '../live-header/live-header';
import { type FeedEntry, entryKey } from './feed-entry';

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

function entryContent(
  entry: FeedEntry,
  drawing: EntryDrawing,
  streaming: boolean,
): React.JSX.Element {
  return entry.type === 'live_header' ? (
    <LiveHeader
      liveHeader={entry.liveHeader}
      toolCall={entry.toolCall}
      now={drawing.now}
    />
  ) : (
    <FeedItem item={entry} {...drawing} streaming={streaming} />
  );
}

/*
 * A row's collapsibles resize it in the list each frame they move, so the rows below move in the
 * same frame. The list data keeps unchanged entries, their gap and their caret, so a row draws
 * again only when one of those changes.
 */
export const FeedRow = memo(function FeedRow(props: FeedRowProps) {
  const { entry, spaceBelow, streaming } = props;
  const layoutSync = useLayoutSync(entryKey(entry), props);

  return (
    <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
      <SessionColumn testID="feed-column" className={spaceBelow}>
        {entryContent(entry, props, streaming)}
      </SessionColumn>
    </CollapsibleLayoutSyncContext.Provider>
  );
});
