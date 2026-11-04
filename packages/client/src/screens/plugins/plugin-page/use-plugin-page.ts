import type { WireNode } from '@repo/contracts/plugins/wire';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import type { OnPageCall } from '../../../lib/product/plugin-registry';
import type { Answer, PageAddresses, PageOpening } from './page-addresses';
import { useLivePage } from './use-live-page';
import { usePageAddresses } from './use-page-addresses';
import { usePageCalls } from './use-page-calls';

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
  const onPageCall = usePageCalls(addresses, opening);

  return { root, onPageCall };
}

// A failed answer leaves the last tree on screen, with its toast, as an App offline draws its last answer.
function useLastDrawn(answer: Answer | undefined): WireNode | null {
  const [last, setLast] = useState<WireNode | null>(null);
  const root = rootOf(answer);

  if (isNewer(root, last)) setLast(root);

  return root ?? last;
}

const rootOf = (answer: Answer | undefined): WireNode | null =>
  answer?.ok ? answer.root : null;

const isNewer = (root: WireNode | null, last: WireNode | null): boolean =>
  root !== null && root !== last;

// The tree at the page's Page state; a new Page state draws the page at its next address.
function useDrawn(
  addresses: PageAddresses,
  opening: PageOpening,
): Answer | undefined {
  useQuery(addresses.state(opening));

  const { data } = useQuery({
    ...addresses.tree(opening),
    placeholderData: keepPreviousData,
    subscribed: useScreenFocused(),
  });

  useErrorToast(failureOf(data));

  return data;
}

const failureOf = (
  answer: Answer | undefined,
): Parameters<typeof useErrorToast>[0] =>
  answer?.ok === false
    ? { title: 'This page could not load', message: answer.error }
    : undefined;
