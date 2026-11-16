import {
  DrawRequest,
  type DrawAnswer,
} from '@repo/contracts/plugins/page-draw';
import type { AppRouter } from '@repo/engine/router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, type TRPCClient, type TRPCLink } from '@trpc/client';
import { observable } from '@trpc/server/observable';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Text } from 'react-native';
import { TRPCProvider } from '#features/connection';
import type { PageAddresses } from '../utils/page-addresses';
import {
  cacheOverMemory,
  type Cache,
  type OnScreen,
  issues,
  onScreen,
  rowsOf,
  settled,
} from '../utils/page-addresses-fixtures';
import { usePageAddresses } from './use-page-addresses';

// A tRPC client whose Plugin draws the Server answers through `draw`.
function clientDrawing(
  draw: (request: DrawRequest) => Promise<DrawAnswer>,
): TRPCClient<AppRouter> {
  const link: TRPCLink<AppRouter> = () => (operation) =>
    observable((observer) => {
      void draw(DrawRequest.parse(operation.op.input)).then((answer) => {
        observer.next({ result: { data: answer } });
        observer.complete();
      });
    });

  return createTRPCClient<AppRouter>({ links: [link] });
}

const idle = (): TRPCClient<AppRouter> =>
  clientDrawing(() => Promise.reject(new Error('Nothing is drawn')));

type Found = (addresses: PageAddresses) => void;

// A caller of the hook, as a Page or the frame is.
function Caller({ found }: { found: Found }): null {
  found(usePageAddresses());

  return null;
}

function Providers(props: {
  queryClient: QueryClient;
  client: TRPCClient<AppRouter>;
  found: Found;
}): React.JSX.Element {
  return (
    <QueryClientProvider client={props.queryClient}>
      <TRPCProvider trpcClient={props.client} queryClient={props.queryClient}>
        <Caller found={props.found} />
        <Caller found={props.found} />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

// Two callers under one provider, rendered once: the instances they got.
function rendered(
  queryClient: QueryClient,
  client: TRPCClient<AppRouter>,
): PageAddresses[] {
  const found: PageAddresses[] = [];

  renderToStaticMarkup(
    <Providers
      queryClient={queryClient}
      client={client}
      found={(addresses) => found.push(addresses)}
    />,
  );

  return found;
}

// Reports whether two callers under one Connection share their Page addresses, and whether another Connection does.
export function SharingMock(): React.JSX.Element {
  const queryClient = new QueryClient();
  const client = idle();
  const [first, second] = rendered(queryClient, client);
  const [otherClient] = rendered(queryClient, idle());
  const [otherCache] = rendered(new QueryClient(), client);

  return (
    <>
      <Text>{`Callers under one Connection share: ${first === second}`}</Text>
      <Text>{`Another tRPC client shares: ${first === otherClient}`}</Text>
      <Text>{`Another QueryClient shares: ${first === otherCache}`}</Text>
    </>
  );
}

// A load more held on a Page's handle, then a stale mark through the frame's: whether the mark waited for it.
async function markedMidLoadMore(
  cache: Cache,
  [page, frame]: [PageAddresses, PageAddresses],
): Promise<{ loading: Promise<void>; waited: boolean }> {
  cache.server.hold();
  cache.server.requests.length = 0;

  const loading = page.loadMore(issues);

  await settled();
  cache.server.write();
  frame.markStale({ pluginId: 'tracker' });
  await settled();

  return { loading, waited: cache.server.requests.length === 1 };
}

// The page's handle and the frame's, as two callers of the hook under one provider hold them.
function handlesOver(cache: Cache): [PageAddresses, PageAddresses] {
  const [page, frame] = rendered(
    cache.client,
    clientDrawing(cache.server.draw),
  );

  if (!page || !frame) throw new Error('No Page addresses');

  return [page, frame];
}

// Releases the held load more and reads what the screen shows once it and the draws it started settle.
async function landed(
  cache: Cache,
  loading: Promise<void>,
  screen: OnScreen,
): Promise<string> {
  cache.server.release();
  await loading;
  await settled();

  const again = cache.server.requests.length === 2;
  const fresh = rowsOf(screen.answer())[0]?.props.edition === 1;

  return `drew again after it landed: ${again}; fresh rows: ${fresh}`;
}

// Reports whether the mark waited, then drew again once the load more landed.
async function markedDuringLoadMore(): Promise<string> {
  const cache = cacheOverMemory();
  const handles = handlesOver(cache);
  const screen = onScreen({ ...cache, addresses: handles[0] }, issues);

  await settled();

  const { loading, waited } = await markedMidLoadMore(cache, handles);
  const outcome = await landed(cache, loading, screen);

  screen.leave();

  return `Mark waited: ${waited}; ${outcome}`;
}

export function StaleMarkMock(): React.JSX.Element {
  const [report, setReport] = React.useState('Running');

  React.useEffect(() => {
    void markedDuringLoadMore().then(setReport);
  }, []);

  return <Text>{report}</Text>;
}
