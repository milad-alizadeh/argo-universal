import type { PageState } from '@repo/contracts/plugins/page-address';
import type {
  OperationCall,
  PageCall,
  PageStateChange,
  WireNode,
} from '@repo/contracts/plugins/wire';
import { useErrorToast } from '@repo/kit/primitives/overlays/toast';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useState } from 'react';
import { useTRPC, useTRPCClient } from '#features/connection';
import { useScreenFocused } from '#lib/product/navigation/navigation';
import { drawStale, putBack, showOptimistic, type Answer } from './draw-cache';

// Which Loader page, and the Project or Session it opened for; the Page state is the page's own.
export type PageOpening = {
  pluginId: string;
  path: string;
  projectId?: string;
  sessionId?: string;
};

export type PluginPageState = {
  root: WireNode | null;
  onPageCall: (call: PageCall) => Promise<void>;
};

/*
 * One Loader page on the connected Server (ADR-0050): its Plugin tree is a query keyed by its Page
 * address, so a revisit draws the kept tree at once and asks again behind it, and a Page state change
 * keeps the tree on screen until the next address has drawn. Only a focused screen asks again.
 */
export function usePluginPage(opening: PageOpening): PluginPageState {
  const [pageState, setPageState] = useState<PageState>({});
  const answer = useDrawn({ ...opening, pageState });
  const run = useOperationRun(opening);
  const change = usePageStateChange(opening, [pageState, setPageState]);

  return {
    root: rootOf(answer),
    onPageCall: (call) => ('operation' in call ? run(call) : change(call)),
  };
}

const rootOf = (answer: Answer | undefined): WireNode | null =>
  answer?.ok ? answer.root : null;

function useDrawn(
  address: PageOpening & { pageState: PageState },
): Answer | undefined {
  const { data } = useQuery({
    ...useTRPC().plugins.draw.queryOptions(address),
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

// The List keeps its spinner until the next address has drawn; an empty change asks again from fresh reads.
function usePageStateChange(
  opening: PageOpening,
  [pageState, setPageState]: [PageState, (next: PageState) => void],
): (call: PageStateChange) => Promise<void> {
  const draws = useTRPC().plugins.draw;
  const client = useQueryClient();

  return async ({ pageState: change }) => {
    const next = { ...pageState, ...change };

    await client.fetchQuery(
      draws.queryOptions({ ...opening, pageState: next }),
    );
    setPageState(next);
  };
}

/*
 * An Operation call: the node it names shows its optimistic props at once, the Operation runs, and every
 * kept address the answer names stale is drawn again. A failure puts the trees back and says why.
 */
function useOperationRun(
  opening: PageOpening,
): (call: OperationCall) => Promise<void> {
  const run = useTRPCClient().plugins.run;
  const cache = { client: useQueryClient(), draws: useTRPC().plugins.draw };

  const { mutateAsync } = useMutation({
    mutationFn: ({ operation, args }: OperationCall) =>
      run.mutate({ ...opening, operation, args }),
    onMutate: (call) => showOptimistic(cache, call),
    onError: (error, _call, before) => putBack(cache.client, error, before),
    onSuccess: ({ stale }) => drawStale(cache, opening.pluginId, stale),
  });

  // The toast already said why a call failed.
  return (call) => mutateAsync(call).then(noAnswer, noAnswer);
}

const noAnswer = (): void => undefined;
