import type { SessionRenameInput } from '@repo/contracts';
import { useCallback, useState } from 'react';
import type { SessionDetailViewProps } from './session-detail-view';

// The title a rename from the page replaced, and the one it asked for.
interface RenamedTitle {
  from: string;
  to: string;
}

export interface PageRename {
  // The page's props, under the title the page renamed the Session to.
  props: SessionDetailViewProps;
  onRenamed: (renamed: SessionRenameInput) => void;
}

// The new title while the Session's own title is still the one it replaced.
const shownTitle = (
  renamed: RenamedTitle | undefined,
  title: string | undefined,
): string | undefined =>
  renamed && renamed.from === title ? renamed.to : undefined;

function retitled(
  props: SessionDetailViewProps,
  title: string | undefined,
): SessionDetailViewProps {
  if (props.state !== 'open' || title === undefined) return props;

  return { ...props, header: { ...props.header, title } };
}

/*
 * A closed Session's Feed sends no snapshot after its first, so a rename from its page would show only when the page
 * opens again. The page shows the new title until the snapshot's own title changes; an open Session's next snapshot
 * carries the new title anyway.
 */
export function useRenamedTitle(props: SessionDetailViewProps): PageRename {
  const [renamed, setRenamed] = useState<RenamedTitle>();
  const title = props.state === 'open' ? props.header.title : undefined;

  const onRenamed = useCallback(
    ({ title: to }: SessionRenameInput) => {
      if (title !== undefined) setRenamed({ from: title, to });
    },
    [title],
  );

  return { props: retitled(props, shownTitle(renamed, title)), onRenamed };
}
