import type {
  LoaderInput,
  LoaderPage,
  PageInput,
} from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import type { DataCall } from './draw-reads';
import { drawReader, type DrawReader } from './draw-reads';
import { eachYielded, firstOf, isYielding, type Stop } from './live-loads';
import { loaderInputOf, pageInputOf, pageTo, renderedList } from './page-input';
import { drawnPaged, type Paged } from './paged-lists';
import type { DrawLists } from './query-reads';
import { valuesOf } from './render-tree';

export type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

// A rendered page: its tree, and how many pages of its paged list it shows.
type Rendered = { root: WireJson; pages: number };

/*
 * What a draw answers: the tree and how many pages its list shows, `live` when its Loader yields, or none
 * for a background pass's load.
 */
export type Drawn = (Rendered & { live?: true }) | null;

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
export type Drawing = {
  draw: (call: DrawCall) => Promise<Drawn>;
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
 * to the host. A background pass only loads. A live Loader is drawn once at its first value, or followed
 * value by value on a live draw.
 */
export const drawing = <State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
): Drawing => ({
  draw: (call) => {
    const run = drawRunOf(page, call);

    return call.event.loadOnly
      ? loadedOnly(page, run.input)
      : drawn(page, run, call.reading);
  },
  live: (call, frame) =>
    followed(page, drawRunOf(page, call), { stop: call.stop, frame }),
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

async function loadedOnly<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  input: LoaderInput<State>,
): Promise<null> {
  const loaded = await page.load(input);

  if (isYielding(loaded)) await firstOf(loaded);

  return null;
}

async function drawn<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  run: DrawRun<State>,
  reading: Reading,
): Promise<Drawn> {
  const { input, pageInput } = run;

  const [loaded, paged] = await Promise.all([
    page.load(input),
    drawnPaged(page.list?.bind(null, input), run, reading.lists),
  ]);

  if (!isYielding(loaded))
    return rendered(page, { data: loaded, pageInput, paged });

  const data = await firstUnlisted(page, loaded);

  return { ...rendered(page, { data, pageInput, paged }), live: true };
}

const unlistedError = 'A live page has no paged list';

// A live Loader's first value, unless its page has a paged list, which a live page cannot.
async function firstUnlisted<State extends PageState, Data, Item>(
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
async function followed<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  { input, pageInput }: DrawRun<State>,
  { stop, frame }: Followed,
): Promise<void> {
  if (page.list) throw new Error(unlistedError);

  const loaded = await page.load(input);

  const each = (data: Data): Promise<void> =>
    frame(rendered(page, { data, pageInput, paged: unlisted }).root);

  if (!isYielding(loaded)) return each(loaded);

  await eachYielded(loaded, stop, each);
}

type Rendering<State extends PageState, Data, Item> = {
  data: Data;
  pageInput: PageInput<State>;
  paged: Paged<Item>;
};

function rendered<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  { data, pageInput, paged }: Rendering<State, Data, Item>,
): Rendered {
  const list = renderedList(paged);
  const root = valuesOf(page.render(data, pageTo(), { ...pageInput, list }));

  return { root, pages: paged.pages };
}
