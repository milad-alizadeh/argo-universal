import type {
  LoaderPagesApi,
  LoaderInput,
  LoaderPage,
} from '@repo/contracts/plugins/loader-page-api';
import {
  matchPagePath,
  type LoaderPageCall,
  type PageState,
} from '@repo/contracts/plugins/page-address';
import type { PluginEvent, WireJson } from '@repo/contracts/plugins/wire';
import { inputOf, pageTo, renderedList } from './page-input';
import {
  forget,
  forgets,
  PagedList,
  type Forgets,
  type Paged,
} from './paged-lists';
import { valuesOf } from './render-tree';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

export type LoaderPageSend = (call: LoaderPageCall) => Promise<void>;

type Params = Record<string, string>;

// What a draw answers: the tree and how many pages its list shows, or none for a background pass's load.
type Drawn = { root: WireJson; pages: number } | null;

// One defined page, its State, Data and Item types closed over, so the list holds pages of any shape.
type Defined = {
  pattern: string;
  draw: (params: Params, event: DrawEvent) => Promise<Drawn>;
};

/*
 * `api` is the Plugin's `argo.pages.define`; `changed` is its `argo.changed()`; `answer` is the host's
 * draws; `forgetting` wraps an Operation's answer: the write is done by then, so every page of every paged
 * list read before it is stale before the host hears of it and draws again.
 */
export interface LoaderPages {
  api: LoaderPagesApi;
  changed: () => void;
  answer: (event: DrawEvent) => void;
  // Throws unless a defined pattern matches the manifest's `background` path, since a pass runs only its `load`.
  requireBackground: (path: string) => void;
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
    api: { define: defining(send, defined, marks) },
    changed: changing(send, marks),
    answer: (event) => void answer(send, defined, event),
    requireBackground: requiringBackground(defined),
    forgetting: (answerWrite) => (call) => {
      forget(marks);

      return answerWrite(call);
    },
  };
}

// `argo.changed()`: what the Plugin wrote outside an Operation also makes its read pages stale.
const changing = (send: LoaderPageSend, marks: Forgets) => (): void => {
  forget(marks);
  void send({ action: 'changed' }).catch(() => null);
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

const requiringBackground =
  (defined: readonly Defined[]) =>
  (path: string): void => {
    if (!defined.some(({ pattern }) => matchPagePath(pattern, path) !== null))
      throw new Error(`Background path ${path} is not a Loader page`);
  };

async function answer(
  send: LoaderPageSend,
  defined: readonly Defined[],
  event: DrawEvent,
): Promise<void> {
  try {
    await send(answered(event, await draw(defined, event)));
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

function draw(defined: readonly Defined[], event: DrawEvent): Promise<Drawn> {
  for (const { pattern, draw: drawPage } of defined) {
    const params = matchPagePath(pattern, event.path);

    if (params) return drawPage(params, event);
  }

  throw new Error(`No Loader page at ${event.path}`);
}

/*
 * Load and read the paged list at once, then render once; the tree goes through JSON so only values cross
 * to the host. A background pass only loads.
 */
const drawing =
  <State extends PageState, Data, Item>(
    page: LoaderPage<State, Data, Item>,
    lists: PagedList<Item>,
  ) =>
  async (params: Params, event: DrawEvent): Promise<Drawn> => {
    const input = inputOf(page.state, params, event);

    if (!event.loadOnly) return drawn(page, lists, { input, event });

    await page.load(input);

    return null;
  };

async function drawn<State extends PageState, Data, Item>(
  page: LoaderPage<State, Data, Item>,
  lists: PagedList<Item>,
  at: { input: LoaderInput<State>; event: DrawEvent },
): Promise<Drawn> {
  const [data, paged] = await Promise.all([
    page.load(at.input),
    pagedOf(page, lists, at),
  ]);

  const list = renderedList(paged);
  const root = valuesOf(page.render(data, pageTo(), { ...at.input, list }));

  return { root, pages: paged.pages };
}

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
