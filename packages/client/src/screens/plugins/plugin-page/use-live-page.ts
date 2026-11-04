import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useReducer } from 'react';
import { useConnectionState } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { Answer, PageAddresses, PageOpening } from './page-addresses';
import { isLive } from './page-answer';

const counted = (round: number): number => round + 1;

/*
 * A live page (ADR-0050) follows its subscription while its screen is focused and the Connection is open, so a
 * reconnect or a return to the page subscribes again, naming the tree kept. A new Page state follows the next
 * address, and a patch onto a tree the App no longer keeps subscribes again at once.
 */
export function useLivePage(
  addresses: PageAddresses,
  opening: PageOpening,
  answer: Answer | undefined,
): void {
  const following = useFollowing(answer);
  const at = useOpening(opening);
  const { data: pageState } = useQuery(addresses.state(opening));
  const [round, again] = useReducer(counted, 0);

  useEffect(
    () => (following ? addresses.followLive(at, again) : undefined),
    [addresses, following, at, pageState, round],
  );
}

function useFollowing(answer: Answer | undefined): boolean {
  const focused = useScreenFocused();
  const open = useConnectionState() === 'open';

  return isLive(answer) && focused && open;
}

// The opening as one value that changes only when the page it names does.
function useOpening({
  pluginId,
  path,
  projectId,
  sessionId,
}: PageOpening): PageOpening {
  return useMemo(
    () => ({ pluginId, path, projectId, sessionId }),
    [pluginId, path, projectId, sessionId],
  );
}
