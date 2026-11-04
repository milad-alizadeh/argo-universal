import type { LoaderPagesApi } from '@repo/contracts/plugins/loader-page-api';
import {
  matchesAnyPagePath,
  matchPagePath,
  type LoaderPageCall,
} from '@repo/contracts/plugins/page-address';
import type { QueriesApi } from '@repo/contracts/plugins/query-results';
import type { PluginEvent } from '@repo/contracts/plugins/wire';
import type { CallOrigin } from '../protocol/call-origin';
import { runtimeError } from '../protocol/runtime-status';
import type { DataCall } from './draw-reads';
import { stopper, type Stop } from './live-loads';
import type { OperationAnswering, OperationSend } from './operation-handlers';
import { operationMarks } from './operation-marks';
import {
  drawing,
  type DrawEvent,
  type Drawing,
  type Drawn,
  type Frame,
  type Reading,
} from './page-drawing';
import { queryReads, type QueryReadSend } from './query-reads';
import { swallowed } from './swallowed';

// One defined page and how it draws.
type Defined = Drawing & { pattern: string };

type StopEvent = Extract<PluginEvent, { type: 'stop' }>;

// What the host asks of a Plugin's Loader pages: a draw, a live draw's stop, or one of its Queries' named reads.
type LoaderEvent = Extract<PluginEvent, { type: 'draw' | 'read' | 'stop' }>;

export type LoaderPageSend = (call: LoaderPageCall) => Promise<void>;

/*
 * The host calls a Plugin's Loader pages answer: their draws, their Queries and their named reads; and
 * what the code running now is for.
 */
export type LoaderCalls = {
  origin: () => CallOrigin;
  pages: LoaderPageSend;
  data: DataCall;
  reads: QueryReadSend;
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
 * Loader ends or the host stops it, then answers that it ended. The worker runs each draw for its id, so
 * the Server gives its `argo` calls, a live draw's included, the draw's Project and Server Device.
 */
export function loaderPages(calls: LoaderCalls): LoaderPages {
  const pages = pagesOf(calls);
  const reads = queryReads(calls.reads, pages.reading.lists);

  return {
    api: { define: defining(pages) },
    queries: reads.api,
    ...operationMarks(calls),
    answer: (event) => {
      if (event.type === 'read') return reads.answer(event);

      if (event.type === 'stop') return stop(pages, event);

      void answer(pages, event);
    },
    requirePage: requiringPage(pages.defined),
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
    const every = checkedEvery(checkedPattern(pattern), page.every);

    defined.push({ pattern, ...drawing(page) });
    void send({
      action: 'defined',
      pattern,
      ...(every !== undefined && { every }),
    }).catch(swallowed);
  };

function checkedPattern(pattern: string): string {
  if (pattern.startsWith('/')) return pattern;

  throw new Error(`A Page path pattern starts with /: ${pattern}`);
}

const isWholeMs = (every: number): boolean =>
  Number.isSafeInteger(every) && every > 0;

function checkedEvery(
  pattern: string,
  every: number | undefined,
): number | undefined {
  if (every === undefined || isWholeMs(every)) return every;

  throw new Error(`A page's every is a whole number of ms: ${pattern}`);
}

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
  const stop = stoppable(pages, event);

  try {
    await pages.send(await settled(pages, event, stop));
  } catch (error) {
    await pages
      .send({ action: 'failed', id: event.id, error: runtimeError(error) })
      .catch(swallowed);
  } finally {
    stop.stop();
    pages.running.delete(event.id);
  }
}

// A live draw can be stopped by its id until it answers.
function stoppable({ running }: Pages, { live, id }: DrawEvent): Stop {
  const stop = stopper();

  if (live) running.set(id, stop);

  return stop;
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

type Matched = { page: Defined; params: Record<string, string> };

function matched(defined: readonly Defined[], path: string): Matched {
  for (const page of defined) {
    const params = matchPagePath(page.pattern, path);

    if (params) return { page, params };
  }

  throw new Error(`No Loader page at ${path}`);
}
