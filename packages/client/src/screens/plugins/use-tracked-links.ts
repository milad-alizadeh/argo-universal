import { slotItemsListLimit } from '@repo/contracts/plugins/wire';
import { useCallback, useState } from 'react';

// Only pull requests and Issues have a state worth drawing beside the link.
const gitItemPath = /^\/[\w-]+\/[\w.-]+\/(pull|issues)\/\d+\/?$/;

// The path alone decides, so a link to a comment (`#issuecomment-…`) or with a query still gets its mark.
function isGitItemLink(href: string): boolean {
  const url = URL.parse(href);

  return url?.hostname === 'github.com' && gitItemPath.test(url.pathname);
}

// One batched Slot call names at most this many links; a feed with more keeps the first.
const withLink = (hrefs: readonly string[], href: string): readonly string[] =>
  hrefs.includes(href) || hrefs.length >= slotItemsListLimit
    ? hrefs
    : [...hrefs, href];

export interface TrackedLinks {
  hrefs: readonly string[];
  track: (href: string) => void;
}

/*
 * The links a Session page has drawn that can carry a mark. A link stays once drawn, so a row that scrolls away and
 * back never asks the Plugins a second list.
 */
export function useTrackedLinks(): TrackedLinks {
  const [hrefs, setHrefs] = useState<readonly string[]>([]);

  const track = useCallback((href: string): void => {
    if (isGitItemLink(href)) setHrefs((held) => withLink(held, href));
  }, []);

  return { hrefs, track };
}
