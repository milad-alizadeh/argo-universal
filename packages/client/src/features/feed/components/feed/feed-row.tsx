import { useSyncLayout } from '@legendapp/list/react-native';
import type { BlobRef } from '@repo/contracts';
import type * as React from 'react';
import { memo, useMemo } from 'react';
import { SessionColumn } from '#lib/product/session-column';
import { CollapsibleLayoutSyncContext } from '#primitives/layout/collapsible';
import { FeedItem } from '../feed-item';
import { LiveHeader } from '../live-header/live-header';
import { type FeedEntry, entryKey, spaceBelowEntry } from './feed-entry';

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
  // The entry after this one, which sets the space below it.
  next: FeedEntry | undefined;
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
  { now, ...drawing }: EntryDrawing,
): React.JSX.Element {
  return entry.type === 'live_header' ? (
    <LiveHeader
      liveHeader={entry.liveHeader}
      toolCall={entry.toolCall}
      now={now}
    />
  ) : (
    <FeedItem item={entry} {...drawing} />
  );
}

/*
 * A row's collapsibles resize it in the list each frame they move, so the rows below move in the
 * same frame. A streaming commit rebuilds the list's `renderItem`, and the view keeps the entries it
 * did not change, so a row only draws again when its own entry or the one after it changed.
 */
export const FeedRow = memo(function FeedRow(props: FeedRowProps) {
  const { entry, next } = props;
  const layoutSync = useLayoutSync(entryKey(entry), props);

  return (
    <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
      <SessionColumn
        testID="feed-column"
        className={spaceBelowEntry(entry, next)}
      >
        {entryContent(entry, props)}
      </SessionColumn>
    </CollapsibleLayoutSyncContext.Provider>
  );
});
