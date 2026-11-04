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
import type { DataCall } from './data-subscription';
import {
  eachYielded,
  firstOf,
  isYielding,
  stopper,
  type Stop,
} from './live-loads';
import type { OperationAnswering, OperationSend } from './operation-handlers';
import { operationMarks } from './operation-marks';
import { inputOf, pageTo, renderedList } from './page-input';
import { drawnPaged, type Paged } from './paged-lists';
import {
  drawReader,
  queryReads,
  type DrawLists,
  type DrawReader,
  type QueryReadSend,
} from './query-reads';
import { valuesOf } from './render-tree';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

type StopEvent = Extract<PluginEvent, { type: 'stop' }>;

// What the host asks of a Plugin's Loader pages: a draw, a live draw's stop, or one of its Queries' named reads.
export type LoaderEvent = Extract<PluginEvent, { type: 'draw' | 'read' | 'stop' }>;

export type LoaderPageSend = (call: LoaderPageCall) => Promise<void>;

// The host calls a Plugin's Loader pages answer: their draws, their Queries and their named reads.
export type LoaderCalls = {
  pages: LoaderPageSend;
  data: DataCall;
  reads: QueryReadSend;
};

type Params = Record<string, string>;

/*
 * What a draw answers: the tree and how many pages its list shows, `live` when its Loader yields, or none
 * for a background pass's load.
 */
type Drawn = { root: WireJson; pages: number; live?: true } | null;

// What one draw reads with: its Queries, and the paged lists of the draws in flight, which Argo reads pages from.
type Reading = { call: DataCall; lists: DrawLists };

// One draw of a matched page: what it is for, what it reads with, and how a live one is stopped.
type DrawCall = {
  params: Params;
  event: DrawEvent;
  reading: Reading;
  stop: Stop;
};

// Where a live draw sends each tree its Loader yields.
type Frame = (root: WireJson) => Promise<void>;

// One defined page, its State, Data and Item types closed over, so the list holds pages of any shape.
type Defined = {
  pattern: string;
  draw: (call: DrawCall) => Promise<Drawn>;
  live: (call: DrawCall, frame: Frame) => Promise<void>;
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
  // Throws unless a defined pattern matches the manifest's `background` path, since a pass runs only its `load`.
  requireBackground: (path: string) => void;
  answering: (send: OperationSend) => OperationAnswering;
}

/*
 * One Plugin's Loader pages: where their answers go, the pages defined, what their draws read with, and how
 * to stop each live draw running, by its id.
 */
type Pages = {
  send: LoaderPageSend;
  defined: Defined[];
  reading: Reading;
  running: Map<number, Stop>;
};

/*
 * The Loader pages a Plugin defined, and the draws the host asks of them (ADR-0050). A draw matches the
 * path to the first pattern defined for it, runs its Loader, then its Render, and answers the tree by the
 * draw's id, or fails it with why. A live draw sends a frame for each value its Loader yields until the
 * Loader ends or the host stops it, then answers that it ended.
 */
export function loaderPages(calls: LoaderCalls): LoaderPages {
  const pages = pagesOf(calls);
  const reads = queryReads(calls.reads, pages.reading.lists);

  return {
    api: { define: defining(pages) },
    queries: reads.api,
    ...operationMarks(calls.pages),
    answer: (event) => {
      if (event.type === 'read') return reads.answer(event);

      if (event.type === 'stop') return stop(pages, event);

      void answer(pages, event);
    },
    requireBackground: requiringBackground(pages.defined),
  };
}

const pagesOf = ({ pages, data }: LoaderCalls): Pages => ({
  send: pages,
  defined: [],
  reading: { call: data, lists: new Map() },
  running: new Map(),
});

const stop = ({ running }: Pages, { id }: StopEvent): void =>
  running.get(id)?.stop();

const defining =
  ({ send, defined }: Pages): LoaderPagesApi['define'] =>
  (pattern, page) => {
    if (!pattern.startsWith('/'))
      throw new Error(`A Page path pattern starts with /: ${pattern}`);

    const { every } = page;

    if (every !== undefined && !(Number.isSafeInteger(every) && every > 0))
      throw new Error(`A page's every is a whole number of ms: ${pattern}`);

    defined.push({ pattern, ...drawing(page) });
    void send({
      action: 'defined',
      pattern,
      ...(every !== undefined && { every }),
    }).catch(() => null);
  };

const requiringBackground =
  (defined: readonly Defined[]) =>
  (path: string): void => {
    if (
      !matchesAnyPagePath(
        defined.map(({ pattern }) => pattern),
        path,
      )
    )
      throw new Error(`Background path ${path} is not a Loader page`);
  };

// A live draw can be stopped by its id until it answers.
async function answer(pages: Pages, event: DrawEvent): Promise<void> {
  const { send, running } = pages;
  const stop = stopper();

  if (event.live) running.set(event.id, stop);

  try {
    await send(await settled(pages, event, stop));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await send({ action: 'failed', id: event.id, error: reason }).catch(
      () => null,
    );
  } finally {
    stop.stop();
    running.delete(event.id);
  }
}

async function settled(
  { send, defined, reading }: Pages,
  event: DrawEvent,
  stop: Stop,
): Promise<LoaderPageCall> {
  const { page, params } = matched(defined, event.path);
  const call = { params, event, reading, stop };

  if (!event.live) return answered(event, await page.draw(call));

  const frame: Frame = (root) => send({ action: 'frame', id: event.id, root });

  await page.live(call, frame);

  return { action: 'ended', id: event.id };
}

// A background pass's load answers that it loaded; a draw answers its tree.
const answered = ({ id }: DrawEvent, drawn: Drawn): LoaderPageCall =>
  drawn ? { action: 'drawn', id, ...drawn } : { action: 'loaded', id };

function matched(
  defined: readonly Defined[],
  path: string,
): { page: Defined; params: Params } {
  for (const page of defined) {
    const params = matchPagePath(page.pattern, path);

    if (params) return { page, params };
  }

  throw new Error(`No Loader page at ${path}`);
}

type Drawing = Pick<Defined, 'draw' | 'live'>;

/*
 * Load and read the paged list at once, then render once; the tree goes through JSON so only values cross
 * to the host. A background pass only loads. A live Loader is drawn once at its first value, or followed
 * value by value on a live draw.
 */
const drawing = <State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
): Drawing => {
  const inputFor = ({ params, event, reading }: DrawCall) => {
    const read = drawReader(reading.call, event.id);

    return { read, input: inputOf(page.state, params, { event, read }) };
  };

  return {
    draw: async (call) => {
      const { input, read } = inputFor(call);

      if (!call.event.loadOnly)
        return drawn(page, { input, event: call.event, read }, call.reading);

      const loaded = await page.load(input);

      if (isYielding(loaded)) await firstOf(loaded);

      return null;
    },
    live: async (call, frame) => {
      if (page.list) throw new Error('A live page has no paged list');

      const { input } = inputFor(call);
      const loaded = await page.load(input);
      const each = (data: Data): Promise<void> =>
        frame(rendered(page, data, input, unlisted).root);

      if (!isYielding(loaded)) return each(loaded);

      await eachYielded(loaded, call.stop, each);
    },
  };
};

type DrawnAt<State extends PageState> = {
  input: LoaderInput<State>;
  event: DrawEvent;
  read: DrawReader;
};

const unlisted: Paged<never> = { items: [], hasMore: false, pages: 0 };

async function drawn<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  at: DrawnAt<State>,
  reading: Reading,
): Promise<Drawn> {
  const [loaded, paged] = await Promise.all([
    page.load(at.input),
    drawnPaged(page.list?.bind(null, at.input), at, reading.lists),
  ]);

  if (!isYielding(loaded)) return rendered(page, loaded, at.input, paged);

  if (page.list) {
    await loaded[Symbol.asyncIterator]().return?.();

    throw new Error('A live page has no paged list');
  }

  const first = await firstOf(loaded);

  return { ...rendered(page, first, at.input, paged), live: true };
}

function rendered<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  data: Data,
  input: LoaderInput<State>,
  paged: Paged<Item>,
): { root: WireJson; pages: number } {
  const list = renderedList(paged);
  const root = valuesOf(page.render(data, pageTo(), { ...input, list }));

  return { root, pages: paged.pages };
}
