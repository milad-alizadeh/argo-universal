import { useQuery } from '@tanstack/react-query';
import { useEffect, useReducer } from 'react';
import { useConnectionState } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { Answer, PageAddresses, PageOpening } from './page-addresses';

const counted = (round: number): number => round + 1;

/*
 * A live page (ADR-0050) follows its subscription while its screen is focused and the Connection is open, so a
 * reconnect or a return to the page subscribes again, naming the tree kept. A patch onto a tree the App no longer
 * keeps subscribes again at once.
 */
export function useLivePage(
  addresses: PageAddresses,
  opening: PageOpening,
  answer: Answer | undefined,
): void {
  const focused = useScreenFocused();
  const open = useConnectionState() === 'open';
  const { data: pageState } = useQuery(addresses.state(opening));
  const [round, again] = useReducer(counted, 0);
  const live = answer?.ok === true && answer.live === true;
  const following = live && focused && open;
  const { pluginId, path, projectId, sessionId } = opening;

  useEffect(() => {
    if (!following) return undefined;

    const at = { pluginId, path, projectId, sessionId };

    return addresses.followLive(at, again);
  }, [
    addresses,
    following,
    pluginId,
    path,
    projectId,
    sessionId,
    pageState,
    round,
  ]);
}
