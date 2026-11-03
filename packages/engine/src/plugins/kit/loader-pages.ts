import type {
  DefineLoaderPage,
  LoaderInput,
  LoaderPage,
  PageTo,
} from '@repo/contracts/plugins/loader-page-api';
import {
  matchPagePath,
  type LoaderPageCall,
  type PageState,
} from '@repo/contracts/plugins/page-address';
import type {
  OperationCall,
  PluginEvent,
  WireJson,
} from '@repo/contracts/plugins/wire';
import { renderTree } from './render-tree';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

export type LoaderPageSend = (call: LoaderPageCall) => Promise<void>;

type Params = Record<string, string>;

// One defined page, its State and Data types closed over, so the list holds pages of any shape.
type Defined = {
  pattern: string;
  draw: (params: Params, event: DrawEvent) => Promise<WireJson>;
};

export interface LoaderPages {
  define: DefineLoaderPage;
  answer: (event: DrawEvent) => void;
}

/*
 * The Loader pages a Plugin defined, and the draws the host asks of them (ADR-0050). A draw matches the
 * path to the first pattern defined for it, runs its Loader, then its Render, and answers the tree by the
 * draw's id, or fails it with why.
 */
export function loaderPages(send: LoaderPageSend): LoaderPages {
  const defined: Defined[] = [];

  return {
    define: (pattern, page) => {
      if (!pattern.startsWith('/'))
        throw new Error(`A Page path pattern starts with /: ${pattern}`);

      defined.push({ pattern, draw: drawing(page) });
      void send({ action: 'defined', pattern }).catch(() => null);
    },
    answer: (event) => void answer(send, defined, event),
  };
}

async function answer(
  send: LoaderPageSend,
  defined: readonly Defined[],
  event: DrawEvent,
): Promise<void> {
  try {
    const root = await draw(defined, event);

    await send({ action: 'drawn', id: event.id, root });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    await send({ action: 'failed', id: event.id, error: reason }).catch(
      () => null,
    );
  }
}

function draw(
  defined: readonly Defined[],
  event: DrawEvent,
): Promise<WireJson> {
  for (const { pattern, draw: drawPage } of defined) {
    const params = matchPagePath(pattern, event.path);

    if (params) return drawPage(params, event);
  }

  throw new Error(`No Loader page at ${event.path}`);
}

// Load, then render once; the tree goes through JSON so only values cross to the host.
const drawing =
  <State extends PageState, Data>(page: LoaderPage<State, Data>) =>
  async (params: Params, event: DrawEvent): Promise<WireJson> => {
    const input = inputOf(page.state, params, event);
    const data = await page.load(input);

    const tree: WireJson = JSON.parse(
      JSON.stringify(renderTree(page.render(data, pageTo(), input))),
    );

    return tree;
  };

// The address's Page state over the page's defaults; the context is the one the App opened the page for.
function inputOf<State extends PageState>(
  defaults: State | undefined,
  params: Params,
  { pageState, projectId, sessionId }: DrawEvent,
): LoaderInput<State> {
  return Object.freeze({
    params: Object.freeze(params),
    state: Object.freeze(stateOf(defaults, pageState)),
    context: Object.freeze({ serverDevice: false, projectId, sessionId }),
  });
}

// The App's Page state is input: a key the defaults name must hold a value of the default's type.
function stateOf<State extends PageState>(
  defaults: State | undefined,
  given: PageState,
): State {
  const state = { ...defaults, ...given };

  if (!fitsDefaults<State>(state, defaults ?? {}))
    throw new Error('This Page state does not fit the page');

  return state;
}

const fitsDefaults = <State extends PageState>(
  state: PageState,
  defaults: PageState,
): state is State =>
  Object.entries(defaults).every(
    ([key, fallback]) => typeof state[key] === typeof fallback,
  );

const pageTo = <State extends PageState>(): PageTo<State> =>
  Object.freeze({
    go: (path) => ({ action: 'navigate', path }),
    set: (change) => ({ pageState: setValues(change) }),
    run: (operation, args, options = {}) =>
      operationCall({ operation, args: { ...args } }, options.optimistic),
  });

// A change leaves out the keys it does not set.
const setValues = (change: Partial<PageState>): PageState =>
  Object.fromEntries(
    Object.entries(change).filter(
      (entry): entry is [string, PageState[string]] => entry[1] !== undefined,
    ),
  );

function operationCall(
  call: OperationCall,
  optimistic: OperationCall['optimistic'],
): OperationCall {
  if (optimistic) return { ...call, optimistic };

  return call;
}
