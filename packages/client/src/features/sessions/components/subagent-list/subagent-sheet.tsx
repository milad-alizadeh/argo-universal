import type * as React from 'react';
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  Sheet,
  useSheet,
  type SheetDestination,
} from '#primitives/overlays/sheet';
import {
  SubagentFeed,
  type SubagentFeedProps,
} from '../subagent-feed/subagent-feed';
import { SubagentList, type SubagentListProps } from './subagent-list';

export interface SubagentSheetProps extends SubagentListProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The Subagent whose Feed is open, drawn as a page over the list; Back reports through `onBack`.
  feed?: SubagentFeedProps;
}

const subagentFeedPage = 'subagent-feed';

// The page follows the open Subagent's props, so updating it cannot loop through the sheet's own render.
function useFeedDestination(
  feed: SubagentFeedProps | undefined,
): SheetDestination | undefined {
  return useMemo(
    () =>
      feed && {
        name: subagentFeedPage,
        title: feed.subagent.title,
        contentScrolls: true,
        onExit: feed.onBack,
        children: <SubagentFeed {...feed} />,
      },
    [feed],
  );
}

type PageProps = SubagentListProps & { feed?: SubagentFeedProps };

/*
 * The Feed is pushed once per Subagent: pushing again on a later render would reopen the page the
 * person just went Back from. While it stays open its content follows the Subagent's own props.
 */
function useFeedPage(feed: SubagentFeedProps | undefined): void {
  const sheet = useSheet();
  const destination = useFeedDestination(feed);
  const pushed = useRef(false);

  useLayoutEffect(() => {
    pushed.current = false;
  }, [feed?.subagent.sessionId]);
  useLayoutEffect(() => {
    if (!destination) return;

    if (pushed.current) return sheet.update(destination);

    pushed.current = true;
    sheet.push(destination);
  }, [sheet, destination]);
}

// The list, with the open Subagent's Feed pushed over it as soon as the Session hands it over.
function SubagentListPage({ feed, ...list }: PageProps): React.JSX.Element {
  useFeedPage(feed);

  return <SubagentList {...list} />;
}

// The Composer's Subagents pill opens the list in the kit's platform Sheet.
export function SubagentSheet(props: SubagentSheetProps): React.JSX.Element {
  const { open, onOpenChange, ...pages } = props;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      label="Subagents"
      contentScrolls
    >
      <Sheet.Page name="subagents" title="Subagents">
        <SubagentListPage {...pages} />
      </Sheet.Page>
    </Sheet>
  );
}
