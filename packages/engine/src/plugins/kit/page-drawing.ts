import type {
  LoaderInput,
  LoaderPage,
  PageInput,
} from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type { DrawnTree } from '@repo/contracts/plugins/page-address';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import type { DataCall } from './draw-reads';
import { drawReader, type DrawReader } from './draw-reads';
import { eachYielded, firstOf, isYielding, type Stop } from './live-loads';
import { loaderInputOf, pageInputOf, pageTo, renderedList } from './page-input';
import { drawnPaged, type Paged } from './paged-lists';
import type { DrawLists } from './query-reads';
import { pageValuesOf } from './render-tree';
import { swallowed } from './swallowed';

export type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

// A rendered page: its tree, and how many pages of its paged list it shows.
type Rendered = DrawnTree;

/*
 * What a draw answers: the tree and how many pages its list shows, `live` when its Loader yields, or none
 * for a background pass's load.
 */
export type DrawnPage = DrawnTree | null;

// What one draw reads with: its Queries, and the paged lists of the draws in flight, which Argo reads pages from.
export type Reading = { call: DataCall; lists: DrawLists };

// One draw of a matched page: what it is for, what it reads with, and how a live one is stopped.
type DrawCall = {
  params: Record<string, string>;
  event: DrawEvent;
  reading: Reading;
  stop: Stop;
};

// Where a live draw sends each tree its Loader yields.
export type Frame = (root: WireJson) => Promise<void>;

// One defined page's draws, its State, Data and Item types closed over, so a list holds pages of any shape.
export type PageDrawer = {
  draw: (call: DrawCall) => Promise<DrawnPage>;
  live: (call: DrawCall, frame: Frame) => Promise<void>;
};

type DrawRun<State extends PageState> = {
  pageInput: PageInput<State>;
  input: LoaderInput<State>;
  event: DrawEvent;
  read: DrawReader;
};

/*
 * Load and read the paged list at once, then render once; the tree goes through JSON so only values cross
 * to the host. A background pass only loads. A live Loader is drawn once at its first value, or followLive
 * value by value on a live draw.
 */
export const pageDrawer = <State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
): PageDrawer => ({
  draw: (call) => {
    const run = drawRunOf(page, call);

    return call.event.loadOnly
      ? loadOnly(page, run.input)
      : drawPage(page, run, call.reading);
  },
  live: (call, frame) =>
    followLive(page, drawRunOf(page, call), { stop: call.stop, frame }),
});

function drawRunOf<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  { params, event, reading }: DrawCall,
): DrawRun<State> {
  const read = drawReader(reading.call);
  const pageInput = pageInputOf(page.state, params, event);

  return {
    pageInput,
    input: loaderInputOf(pageInput, read),
    event,
    read,
  };
}

async function loadOnly<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  input: LoaderInput<State>,
): Promise<null> {
  const loaded = await page.load(input);

  if (isYielding(loaded)) await firstOf(loaded);

  return null;
}

async function drawPage<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  run: DrawRun<State>,
  reading: Reading,
): Promise<DrawnPage> {
  const { input, pageInput } = run;

  const [loaded, paged] = await Promise.all([
    page.load(input),
    drawnPaged(page.list?.bind(null, input), run, reading.lists),
  ]);

  if (!isYielding(loaded))
    return renderPage(page, { data: loaded, pageInput, paged });

  const data = await takeFirst(page, loaded);

  return { ...renderPage(page, { data, pageInput, paged }), live: true };
}

const unlistedError = 'A live page has no paged list';

// A live Loader's first value, unless its page has a paged list, which a live page cannot.
async function takeFirst<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  loaded: AsyncIterable<Data>,
): Promise<Data> {
  if (!page.list) return firstOf(loaded);

  await loaded[Symbol.asyncIterator]().return?.();

  throw new Error(unlistedError);
}

type Followed = { stop: Stop; frame: Frame };

const unlisted: Paged<never> = { items: [], hasMore: false, pages: 0 };

// A live draw renders each value its Loader yields to a frame; a Loader that answers once sends one.
async function followLive<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  { input, pageInput }: DrawRun<State>,
  { stop, frame }: Followed,
): Promise<void> {
  const loaded = await firstLoad(page, input, stop.stopped);

  if (loaded === null) return;

  const each = (data: Data): Promise<void> =>
    frame(renderPage(page, { data, pageInput, paged: unlisted }).root);

  if (!isYielding(loaded.value)) return each(loaded.value);

  await eachYielded(loaded.value, stop, each);
}

type Loaded<Data> = { value: Data | AsyncIterable<Data> };

// The Loader's first answer, or none once stopped before it came: a Loader that never settles must not hold its draw.
async function firstLoad<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  input: LoaderInput<State>,
  stopped: Stop['stopped'],
): Promise<Loaded<Data> | null> {
  if (page.list) throw new Error(unlistedError);

  const loading = Promise.resolve(page.load(input)).then((value) => ({
    value,
  }));

  const loaded = await Promise.race([loading, stopped.then(() => null)]);

  if (loaded === null) endLate(loading);

  return loaded;
}

// A Loader stopped before it answered: if it yields values later, its iterator is closed so its `finally` runs.
function endLate<Data>(
  loading: Promise<{ value: Data | AsyncIterable<Data> }>,
): void {
  void loading
    .then(({ value }) => {
      if (isYielding(value)) void value[Symbol.asyncIterator]().return?.();
    })
    .catch(swallowed);
}

type Rendering<State extends PageState, Data, Item> = {
  data: Data;
  pageInput: PageInput<State>;
  paged: Paged<Item>;
};

function renderPage<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  { data, pageInput, paged }: Rendering<State, Data, Item>,
): Rendered {
  const list = renderedList(paged);
  const root = pageValuesOf(
    page.render(data, pageTo(), { ...pageInput, list }),
  );

  return { root, pages: paged.pages };
}
