import type * as React from 'react';
import { useLayoutEffect, useMemo } from 'react';
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

// The list, with the open Subagent's Feed pushed over it as soon as the Session hands it over.
function SubagentListPage({ feed, ...list }: PageProps): React.JSX.Element {
  const sheet = useSheet();
  const destination = useFeedDestination(feed);
  useLayoutEffect(() => {
    if (destination) sheet.push(destination);
  }, [sheet, destination]);

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
