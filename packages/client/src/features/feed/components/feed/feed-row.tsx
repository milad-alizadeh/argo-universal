import { useSyncLayout } from '@legendapp/list/react-native';
import type { BlobRef } from '@repo/contracts';
import { CollapsibleLayoutSyncContext } from '@repo/kit/primitives/layout/collapsible';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { createContext, memo, useContext, useMemo } from 'react';
import { SessionColumn } from '#lib/product/session-column';
import { FeedItem } from '../feed-item';
import { type FeedEntry, entryKey } from './feed-entry';
import { LiveHeaderRow } from './live-header-row';

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

export const FeedTrayInset = createContext(false);

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
  // Match the tray's outer inset plus its 12px callout padding.
  const inset = useContext(FeedTrayInset) && 'px-10 web:px-7.5';

  return (
    <CollapsibleLayoutSyncContext.Provider value={layoutSync}>
      <SessionColumn testID="feed-column" className={cn(spaceBelow, inset)}>
        <EntryContent {...props} />
      </SessionColumn>
    </CollapsibleLayoutSyncContext.Provider>
  );
});
