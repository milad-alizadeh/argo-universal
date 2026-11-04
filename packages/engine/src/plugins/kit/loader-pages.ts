import type {
  LoaderPagesApi,
  LoaderInput,
  LoaderPage,
} from '@repo/contracts/plugins/loader-page-api';
import {
  matchesAnyPagePath,
  matchPagePath,
  type LoaderPageCall,
  type PageState,
} from '@repo/contracts/plugins/page-address';
import type { QueriesApi } from '@repo/contracts/plugins/query-results';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { inDraw } from './call-scope';
import type { DataCall } from './data-subscription';
import type { OperationAnswering, OperationSend } from './operation-handlers';
import { operationMarks } from './operation-marks';
import { inputOf, pageTo, renderedList } from './page-input';
import { drawnPaged } from './paged-lists';
import {
  drawReader,
  queryReads,
  type DrawLists,
  type DrawReader,
  type QueryReadSend,
} from './query-reads';
import { valuesOf } from './render-tree';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

// What the host asks of a Plugin's Loader pages: a draw, or one of the named reads its Queries run.
export type LoaderEvent = Extract<PluginEvent, { type: 'draw' | 'read' }>;

export type LoaderPageSend = (call: LoaderPageCall) => Promise<void>;

// The host calls a Plugin's Loader pages answer: their draws, their Queries and their named reads.
export type LoaderCalls = {
  pages: LoaderPageSend;
  data: DataCall;
  reads: QueryReadSend;
};

type Params = Record<string, string>;

// What a draw answers: the tree and how many pages its list shows, or none for a background pass's load.
type Drawn = { root: WireJson; pages: number } | null;

// What one draw reads with: its Queries, and the paged lists of the draws in flight, which Argo reads pages from.
type Reading = { call: DataCall; lists: DrawLists };

// One defined page, its State, Data and Item types closed over, so the list holds pages of any shape.
type Defined = {
  pattern: string;
  draw: (params: Params, event: DrawEvent, reading: Reading) => Promise<Drawn>;
};

/*
 * `api` is the Plugin's `argo.pages.define` and `queries` its `argo.queries`; `changed` is its
 * `argo.changed()`; `answer` is the host's draws and named reads; `answering` runs and answers the
 * Plugin's Operations, whose answer the host marks stale.
 */
export interface LoaderPages {
  api: LoaderPagesApi;
  queries: QueriesApi;
  changed: () => void;
  answer: (event: LoaderEvent) => void;
  /*
   * Throws unless a defined pattern matches a path the manifest names, such as its `background` pass, which
   * runs only a `load`, or a `contributes.accounts` page; `contribution` names which in the error.
   */
  requirePage: (path: string, contribution: string) => void;
  answering: (send: OperationSend) => OperationAnswering;
}

// One Plugin's Loader pages: where their answers go, the pages defined, and what their draws read with.
type Pages = { send: LoaderPageSend; defined: Defined[]; reading: Reading };

/*
 * The Loader pages a Plugin defined, and the draws the host asks of them (ADR-0050). A draw matches the
 * path to the first pattern defined for it, runs its Loader, then its Render, and answers the tree by the
 * draw's id, or fails it with why. A draw's `argo` calls run in its scope, so the Server gives them the
 * draw's Project and Server Device.
 */
export function loaderPages(calls: LoaderCalls): LoaderPages {
  const pages = pagesOf(calls);
  const reads = queryReads(calls.reads, pages.reading.lists);

  return {
    api: { define: defining(pages) },
    queries: reads.api,
    ...operationMarks(calls.pages),
    answer: (event) =>
      event.type === 'read' ? reads.answer(event) : void answer(pages, event),
    requirePage: requiringPage(pages.defined),
  };
}

const pagesOf = ({ pages, data }: LoaderCalls): Pages => ({
  send: pages,
  defined: [],
  reading: { call: data, lists: new Map() },
});

const defining =
  ({ send, defined }: Pages): LoaderPagesApi['define'] =>
  (pattern, page) => {
    if (!pattern.startsWith('/'))
      throw new Error(`A Page path pattern starts with /: ${pattern}`);

    defined.push({ pattern, draw: drawing(page) });
    void send({ action: 'defined', pattern }).catch(() => null);
  };

const requiringPage =
  (defined: readonly Defined[]) =>
  (path: string, contribution: string): void => {
    if (
      !matchesAnyPagePath(
        defined.map(({ pattern }) => pattern),
        path,
      )
    )
      throw new Error(`${contribution} path ${path} is not a Loader page`);
  };

async function answer(pages: Pages, event: DrawEvent): Promise<void> {
  const { send } = pages;

  try {
    const drawn = await inDraw(event.id, () => draw(pages, event));

    await send(answered(event, drawn));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await send({ action: 'failed', id: event.id, error: reason }).catch(
      () => null,
    );
  }
}

// A background pass's load answers that it loaded; a draw answers its tree.
const answered = (
  { id }: DrawEvent,
  drawn: Drawn,
): Parameters<LoaderPageSend>[0] =>
  drawn ? { action: 'drawn', id, ...drawn } : { action: 'loaded', id };

function draw({ defined, reading }: Pages, event: DrawEvent): Promise<Drawn> {
  for (const { pattern, draw: drawPage } of defined) {
    const params = matchPagePath(pattern, event.path);

    if (params) return drawPage(params, event, reading);
  }

  throw new Error(`No Loader page at ${event.path}`);
}

/*
 * Load and read the paged list at once, then render once; the tree goes through JSON so only values cross
 * to the host. A background pass only loads.
 */
const drawing =
  <State extends PageState, Data, Item>(page: LoaderPage<State, Data, Item>) =>
  async (
    params: Params,
    event: DrawEvent,
    reading: Reading,
  ): Promise<Drawn> => {
    const read = drawReader(reading.call, event.id);
    const input = inputOf(page.state, params, { event, read });

    if (!event.loadOnly) return drawn(page, { input, event, read }, reading);

    await page.load(input);

    return null;
  };

type DrawnAt<State extends PageState> = {
  input: LoaderInput<State>;
  event: DrawEvent;
  read: DrawReader;
};

async function drawn<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  at: DrawnAt<State>,
  reading: Reading,
): Promise<Drawn> {
  const [data, paged] = await Promise.all([
    page.load(at.input),
    drawnPaged(page.list?.bind(null, at.input), at, reading.lists),
  ]);

  const list = renderedList(paged);
  const root = valuesOf(page.render(data, pageTo(), { ...at.input, list }));

  return { root, pages: paged.pages };
}
