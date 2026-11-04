import type { WireNode } from '@repo/contracts/plugins/wire';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { OnPageCall } from '../../lib/product/plugin-registry';
import type { Answer, PageAddresses, PageOpening } from './page-addresses';
import { pageCallsPorts } from './page-calls-ports';
import { useLivePage } from './use-live-page';
import { usePageAddresses } from './use-page-addresses';
import { useOperationRunner, useTreeCalls } from './use-tree-calls';

export type PluginPageState = { root: WireNode | null; onPageCall: OnPageCall };

/*
 * One Loader page on the connected Server (ADR-0050): its Plugin tree is kept by its Page address, so a
 * revisit draws the kept tree at once and asks again behind it, naming what it keeps so an unchanged page
 * costs no tree. A Page state change keeps the tree on screen until the next address has drawn; load more
 * appends the next page's rows; a bound search or selection changes the Page state once the edits pause.
 * Only a focused screen asks again: on a stale mark, on the page's interval, or, for a live page, on its
 * subscription.
 */
export function usePluginPage(opening: PageOpening): PluginPageState {
  const addresses = usePageAddresses();
  const answer = useDrawn(addresses, opening);

  useLivePage(addresses, opening, answer);

  const root = useLastDrawn(answer);

  const onPageCall = useTreeCalls(
    pageCallsPorts(addresses, opening, useOperationRunner()),
  );

  return { root, onPageCall };
}

/*
 * A failed answer leaves the last tree on screen, as an App offline draws its last answer, or says the page
 * could not be shown when there is none. The Plugin's one drawing-failure toast says why (ADR-0037).
 */
function useLastDrawn(answer: Answer | undefined): WireNode | null {
  return useKeptRoot(rootOf(answer)) ?? fallbackOf(answer);
}

// The newest tree drawn, kept while a later answer has none.
function useKeptRoot(root: WireNode | null): WireNode | null {
  const [last, setLast] = useState<WireNode | null>(null);

  if (isNewer(root, last)) setLast(root);

  return root ?? last;
}

// A page that failed before it drew anything shows the fallback; one still loading shows nothing yet.
const fallbackOf = (answer: Answer | undefined): WireNode | null =>
  answer?.ok === false ? pluginPageFallback : null;

const rootOf = (answer: Answer | undefined): WireNode | null =>
  answer?.ok ? answer.root : null;

const isNewer = (root: WireNode | null, last: WireNode | null): boolean =>
  root !== null && root !== last;

/*
 * The tree at the page's Page state; a new Page state draws the page at its next address. The Page state is read
 * here and handed to the tree's options, so the React Compiler, which keeps those options while their inputs
 * hold, sees the address change.
 */
function useDrawn(
  addresses: PageAddresses,
  opening: PageOpening,
): Answer | undefined {
  const { data: pageState } = useQuery(addresses.state(opening));

  const { data } = useQuery({
    ...addresses.tree(opening, pageState),
    placeholderData: keepPreviousData,
    subscribed: useScreenFocused(),
  });

  return data;
}
