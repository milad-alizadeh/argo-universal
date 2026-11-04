import type {
  LoaderInput,
  PageInput,
  PagedList as RenderedList,
  PageTo,
} from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type {
  LoadMore,
  PageStateChange,
  PluginEvent,
} from '@repo/contracts/plugins/wire';
import type { Paged } from './paged-lists';
import type { DrawReader } from './query-reads';
import { renderContext } from './render-context';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

/*
 * The address's Page state over the page's defaults; the context is the one the App opened the page for.
 * Both the Loader and the Render get it.
 */
export function pageInputOf<State extends PageState>(
  defaults: State | undefined,
  params: Record<string, string>,
  event: DrawEvent,
): PageInput<State> {
  return Object.freeze({
    params: Object.freeze(params),
    state: Object.freeze(stateOf(defaults, event.pageState)),
    context: renderContext(event),
  });
}

// Only the Loader reads, and its Queries are read for this draw.
export const loaderInputOf = <State extends PageState>(
  input: PageInput<State>,
  read: DrawReader,
): LoaderInput<State> =>
  Object.freeze({ ...input, read: (query) => read(query, false) });

/*
 * The App's Page state is input, and the App keeps it across visits: a kept value whose type is no longer its
 * default's, as after the Plugin changed that default, draws with the default instead, so the page never locks.
 */
function stateOf<State extends PageState>(
  defaults: State | undefined,
  given: PageState,
): State {
  const kept: PageState = defaults ?? {};
  const state = { ...kept, ...fittingOf(kept, given) };

  if (!fitsDefaults<State>(state, kept))
    throw new Error('This Page state does not fit the page');

  return state;
}

const fitting = (
  defaults: PageState,
  key: string,
  value: PageState[string],
): boolean => !(key in defaults) || typeof value === typeof defaults[key];

const fittingOf = (defaults: PageState, given: PageState): PageState =>
  Object.fromEntries(
    Object.entries(given).filter(([key, value]) =>
      fitting(defaults, key, value),
    ),
  );

const fitsDefaults = <State extends PageState>(
  state: PageState,
  defaults: PageState,
): state is State =>
  Object.entries(defaults).every(
    ([key, fallback]) => typeof state[key] === typeof fallback,
  );

export const pageTo = <State extends PageState>(): PageTo<State> =>
  Object.freeze({
    go: (path) => ({ action: 'navigate', path }),
    set: (change) => ({ pageState: setValues(change) }),
    bind: (key) => ({ bind: key }),
    run: (operation, args, { optimistic } = {}) => ({
      operation,
      args: { ...args },
      ...(optimistic && { optimistic }),
    }),
    payload: (field) => ({ $payload: field ?? true }),
  });

type SetValues = PageStateChange['pageState'];

// A change leaves out the keys it does not set.
const setValues = (change: Partial<SetValues>): SetValues =>
  Object.fromEntries(
    Object.entries(change).filter(
      (entry): entry is [string, SetValues[string]] => entry[1] !== undefined,
    ),
  );

const loadMore: LoadMore = { loadMore: true };

// The pages of a paged list as its Render sees them, with the load more it puts in the tree as a value.
export const renderedList = <Item>({
  items,
  hasMore,
}: Paged<Item>): RenderedList<Item> =>
  Object.freeze({ items, hasMore, loadMore });
