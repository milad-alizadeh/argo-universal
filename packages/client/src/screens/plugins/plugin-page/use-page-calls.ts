import type {
  OperationCall,
  PageCall,
  PageStateChange,
  WireJson,
} from '@repo/contracts/plugins/wire';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTRPCClient } from '#features/connection';
import {
  drawFresh,
  drawOptions,
  putBack,
  showOptimistic,
  type Address,
  type Answer,
  type Drawing,
} from './draw-cache';
import type { PageMemory } from './page-state-memory';
import { useBind } from './use-bind';

// Which Loader page, and the Project or Session it opened for; the Page state is the page's own.
export type PageOpening = {
  pluginId: string;
  path: string;
  projectId?: string;
  sessionId?: string;
};

type Page = { drawing: Drawing; opening: PageOpening; memory: PageMemory };

export type OnPageCall = (call: PageCall, value?: WireJson) => Promise<void>;

type PageStateCall = Exclude<PageCall, OperationCall>;

type Change = (call: PageStateChange) => Promise<void>;

// A Loader page's calls: an Operation runs; load more, a bound value and a Page state change draw again.
export function usePageCalls(page: Page): OnPageCall {
  const run = useOperationRun(page);
  const change = usePageStateChange(page);
  const bind = useBind(change);
  const address = { ...page.opening, pageState: page.memory[0] };

  const onPageState = (
    call: PageStateCall,
    value?: WireJson,
  ): Promise<void> => {
    if ('loadMore' in call) return loadMore(page.drawing, address);

    return 'bind' in call ? bind(call.bind, value) : change(call);
  };

  return (call, value) =>
    'operation' in call ? run(call) : onPageState(call, value);
}

// One more page of the address's paged list, appended to the tree the App keeps.
function loadMore(drawing: Drawing, address: Address): Promise<void> {
  const held = drawing.client.getQueryData<Answer>(
    drawOptions(drawing, address).queryKey,
  );

  return held?.ok
    ? drawPages(drawing, address, held.pages + 1)
    : Promise.resolve();
}

async function drawPages(
  drawing: Drawing,
  address: Address,
  pages: number,
): Promise<void> {
  const { queryKey } = drawOptions(drawing, address);

  drawing.client.setQueryData(
    queryKey,
    await drawFresh(drawing, address, pages),
  );
}

/*
 * The List keeps its spinner until the next address has drawn. An empty change, a pull, draws the same
 * address again from its first page.
 */
function usePageStateChange({ drawing, opening, memory }: Page): Change {
  const [pageState, setPageState] = memory;
  const latest = useRef(pageState);

  useEffect(() => {
    latest.current = pageState;
  }, [pageState]);

  return async ({ pageState: change }) => {
    const next = { ...latest.current, ...change };

    await drawnAt(drawing, { ...opening, pageState: next }, change);
    latest.current = next;
    setPageState(next);
  };
}

async function drawnAt(
  drawing: Drawing,
  address: Address,
  change: PageStateChange['pageState'],
): Promise<void> {
  if (Object.keys(change).length === 0) return drawPages(drawing, address, 1);

  await drawing.client.fetchQuery(drawOptions(drawing, address));
}

/*
 * An Operation call: the nodes it names show their optimistic props at once and the Operation runs. Its
 * settled trees come from the Server's stale mark (useStaleMarks), which also reaches the other Apps; a
 * failure puts the trees back and says why.
 */
function useOperationRun({
  drawing,
  opening,
}: Page): (call: OperationCall) => Promise<void> {
  const run = useTRPCClient().plugins.run;
  const { pluginId, projectId, sessionId } = opening;

  // An Operation belongs to the Plugin, not to the page it was called from.
  const { mutateAsync } = useMutation({
    mutationFn: ({ operation, args }: OperationCall) =>
      run.mutate({ pluginId, projectId, sessionId, operation, args }),
    onMutate: (call) => showOptimistic(drawing, call),
    onError: (error, _call, before) => putBack(drawing.client, error, before),
  });

  // The toast already said why a call failed.
  return (call) => mutateAsync(call).then(noAnswer, noAnswer);
}

const noAnswer = (): void => undefined;
