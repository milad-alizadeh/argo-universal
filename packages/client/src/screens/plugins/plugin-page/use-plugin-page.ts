import type { WireNode } from '@repo/contracts/plugins/wire';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import {
  drawOptions,
  useDrawing,
  type Address,
  type Answer,
  type Drawing,
} from './draw-cache';
import { usePageStateMemory } from './page-state-memory';
import {
  usePageCalls,
  type OnPageCall,
  type PageOpening,
} from './use-page-calls';
import { freshMs, usePrefetch } from './use-prefetch';

export type { PageOpening } from './use-page-calls';

export type PluginPageState = { root: WireNode | null; onPageCall: OnPageCall };

/*
 * One Loader page on the connected Server (ADR-0050): its Plugin tree is a query keyed by its Page
 * address, so a revisit draws the kept tree at once and asks again behind it, naming what it keeps so an
 * unchanged page costs no tree. A Page state change keeps the tree on screen until the next address has
 * drawn; load more appends the next page's rows; a bound search or selection changes the Page state once
 * the edits pause. Only a focused screen asks again, and the Loader pages its first links open are drawn ahead.
 */
export function usePluginPage(opening: PageOpening): PluginPageState {
  const drawing = useDrawing();
  const memory = usePageStateMemory(opening);
  const address = { ...opening, pageState: memory[0] };
  const root = useLastDrawn(useDrawn(drawing, address));
  const onPageCall = usePageCalls({ drawing, opening, memory });

  usePrefetch(opening, root);

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

function useDrawn(drawing: Drawing, address: Address): Answer | undefined {
  const { data } = useQuery({
    ...drawOptions(drawing, address),
    placeholderData: keepPreviousData,
    staleTime: freshMs,
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
