import type {
  LoaderPagesApi,
  LoaderInput,
  LoaderPage,
  PagedList as RenderedList,
} from '@repo/contracts/plugins/loader-page-api';
import {
  matchPagePath,
  type LoaderPageCall,
  type PageState,
} from '@repo/contracts/plugins/page-address';
import type {
  LoadMore,
  PluginEvent,
  WireJson,
} from '@repo/contracts/plugins/wire';
import { inputOf, pageTo } from './page-input';
import {
  forget,
  forgets,
  PagedList,
  type Forgets,
  type Paged,
} from './paged-lists';
import { renderTree } from './render-tree';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

export type LoaderPageSend = (call: LoaderPageCall) => Promise<void>;

type Params = Record<string, string>;

type Drawn = { root: WireJson; pages: number };

// One defined page, its State, Data and Item types closed over, so the list holds pages of any shape.
type Defined = {
  pattern: string;
  draw: (params: Params, event: DrawEvent) => Promise<Drawn>;
};

/*
 * `api` is the Plugin's `argo.pages.define` and `stale`; `answer` is the host's draws; `forgetting` wraps an
 * Operation's answer: the write is done by then, so every page of every paged list read before it is stale
 * before the host hears of it and draws again.
 */
export interface LoaderPages {
  api: LoaderPagesApi;
  answer: (event: DrawEvent) => void;
  forgetting: <Call, Answer>(
    answerWrite: (call: Call) => Promise<Answer>,
  ) => (call: Call) => Promise<Answer>;
}

/*
 * The Loader pages a Plugin defined, and the draws the host asks of them (ADR-0050). A draw matches the
 * path to the first pattern defined for it, runs its Loader, then its Render, and answers the tree by the
 * draw's id, or fails it with why.
 */
export function loaderPages(send: LoaderPageSend): LoaderPages {
  const defined: Defined[] = [];
  const marks = forgets();

  return {
    api: {
      define: defining(send, defined, marks),
      stale: staling(send, marks),
    },
    answer: (event) => void answer(send, defined, event),
    forgetting: (answerWrite) => (call) => {
      forget(marks);

      return answerWrite(call);
    },
  };
}

// A Plugin's own stale mark: what it wrote outside an Operation also makes its read pages stale.
const staling =
  (send: LoaderPageSend, marks: Forgets): LoaderPagesApi['stale'] =>
  () => {
    forget(marks);
    void send({ action: 'stale' }).catch(() => null);
  };

const defining =
  (
    send: LoaderPageSend,
    defined: Defined[],
    marks: Forgets,
  ): LoaderPagesApi['define'] =>
  (pattern, page) => {
    if (!pattern.startsWith('/'))
      throw new Error(`A Page path pattern starts with /: ${pattern}`);

    defined.push({ pattern, draw: drawing(page, new PagedList(marks)) });
    void send({ action: 'defined', pattern }).catch(() => null);
  };

async function answer(
  send: LoaderPageSend,
  defined: readonly Defined[],
  event: DrawEvent,
): Promise<void> {
  try {
    const { root, pages } = await draw(defined, event);

    await send({ action: 'drawn', id: event.id, root, pages });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await send({ action: 'failed', id: event.id, error: reason }).catch(
      () => null,
    );
  }
}

function draw(defined: readonly Defined[], event: DrawEvent): Promise<Drawn> {
  for (const { pattern, draw: drawPage } of defined) {
    const params = matchPagePath(pattern, event.path);

    if (params) return drawPage(params, event);
  }

  throw new Error(`No Loader page at ${event.path}`);
}

// Load and read the paged list at once, then render once; the tree goes through JSON so only values cross to the host.
const drawing =
  <State extends PageState, Data, Item>(
    page: LoaderPage<State, Data, Item>,
    lists: PagedList<Item>,
  ) =>
  async (params: Params, event: DrawEvent): Promise<Drawn> => {
    const input = inputOf(page.state, params, event);

    const [data, paged] = await Promise.all([
      page.load(input),
      pagedOf(page, lists, { input, event }),
    ]);

    const list = renderedList(paged);
    const root = valuesOf(page.render(data, pageTo(), { ...input, list }));

    return { root, pages: paged.pages };
  };

const valuesOf = (element: Parameters<typeof renderTree>[0]): WireJson =>
  JSON.parse(JSON.stringify(renderTree(element)));

const none: Paged<never> = { items: [], hasMore: false, pages: 0 };

// The pages the App shows of the paged list, kept by address, so a further page reads only itself.
function pagedOf<State extends PageState, Data, Item>(
  { list }: LoaderPage<State, Data, Item>,
  lists: PagedList<Item>,
  { input, event }: { input: LoaderInput<State>; event: DrawEvent },
): Promise<Paged<Item>> {
  if (!list) return Promise.resolve(none);

  return lists.read(addressOf(event), event.pages, async (cursor) =>
    list(input, cursor),
  );
}

const addressOf = ({
  path,
  pageState,
  projectId,
  sessionId,
}: DrawEvent): string =>
  JSON.stringify([path, pageState, projectId ?? null, sessionId ?? null]);

const loadMore: LoadMore = { loadMore: true };

const renderedList = <Item>({
  items,
  hasMore,
}: Paged<Item>): RenderedList<Item> =>
  Object.freeze({ items, hasMore, loadMore });
