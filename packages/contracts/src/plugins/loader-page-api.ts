import type { ReactNode } from 'react';
import type { PluginQuery } from './argo-calls';
import type { PluginRenderContext } from './kit';
import type { OperationArgs, OperationDeclarations } from './operations-api';
import type { PageState } from './page-address';
import type { QueryResult } from './query-results';
import type {
  LoadMore,
  OperationCall,
  PageBind,
  PageStateChange,
} from './wire-action';
import type { CrossesAsJson } from './wire-json';

/*
 * A Loader page (ADR-0050), as `argo.pages.define(pattern, page)` takes it. Every draw runs `load` and
 * then `render`, once, in that order, for one Page address:
 *
 * - `state` holds the Page state's defaults; the address's Page state is merged over them, so a key the
 *   App never set reads its default.
 * - `load` reads everything the page shows but its paged list. It may be slow; the App keeps the previous
 *   Plugin tree on screen until the next one lands. What it throws fails the draw, and the App says so.
 *   `input.read(query)` reads a Query, described or named, through Argo's cache: the answer Argo keeps,
 *   unless a write made it due. A manifest's `background` pass runs `load` alone, for one Project, on its
 *   interval, reads every Query fresh and drops the answer, so the pages that read them draw again when
 *   their answers changed.
 * - `list`, when the page has a paged list, reads one page of it from `cursor` (null for the first) and
 *   answers its items and the cursor of the page after, or null at the end. Argo keeps each page as a Query
 *   of the address and cursor, so a load more reads only the page it lacks; an Operation or
 *   `argo.changed()` makes every kept page due. The first page alone is read again on every draw. An item
 *   equal to one already listed is dropped, so a cursor may include the boundary item. Items cross to
 *   Argo as JSON, so an item must be JSON all through: a `Date` or a `Map` fails type-checking.
 * - `render` is pure: no hooks, no effects, no function props. A Component event holds a value made by
 *   `to`, which the App acts on itself; a function prop fails the draw. `input.list` holds the pages read.
 * - `every`, in milliseconds, draws the page again on that interval while it is on screen, clamped to at
 *   least ten seconds; a Query the Loader reads is read again once its answer is older than the interval,
 *   so a redraw that finds nothing new costs the App no tree.
 * - A live page's `load` yields over time, as an async generator does, such as a log tail. While the page
 *   is on screen the App keeps a subscription to it: each value yielded is rendered, and the App receives
 *   only what changed from the tree before. When the App leaves the page the Loader is stopped, and its
 *   `finally` runs once the await it is in settles. Only what it yields draws a live page: a write or `every` does
 *   not draw it again, so a Loader that shows the Plugin's own writes waits for them itself. A live page
 *   has no paged list.
 */
export type LoaderPage<
  State extends PageState,
  Data,
  Item = never,
  Operations = OperationDeclarations,
> = Readonly<{
  state?: State;
  every?: number;
  load: (
    input: LoaderInput<State>,
  ) => Data | Promise<Data> | AsyncIterable<Data>;
  list?: (
    input: LoaderInput<State>,
    cursor: string | null,
  ) => ListPage<Item> | Promise<ListPage<Item>>;
  render: (
    data: Data,
    to: PageTo<State, Operations>,
    input: RenderInput<State, Item>,
  ) => ReactNode;
}>;

/*
 * What a draw is for: the pattern's `:params` from the Page path, the Page state, and the page's context;
 * `read` reads a Query for it, held by its Page address.
 */
export type LoaderInput<State extends PageState> = Readonly<{
  params: Readonly<Record<string, string>>;
  state: Readonly<State>;
  context: PluginRenderContext;
  read: <Query extends PluginQuery>(
    query: Query,
  ) => Promise<QueryResult<Query>>;
}>;

export type ListPage<Item> = { items: Item[]; cursor: string | null };

// The paged list's items so far; `loadMore` goes in the List's `pagination` and the App appends the next page.
export type PagedList<Item> = Readonly<{
  items: readonly Item[];
  hasMore: boolean;
  loadMore: LoadMore;
}>;

export type RenderInput<State extends PageState, Item> = LoaderInput<State> &
  Readonly<{ list: PagedList<Item> }>;

/*
 * The values a Render puts in its Component events. `go` opens another Page path; `set` merges a change
 * into the Page state and draws the new address, and an empty change draws the same address again from
 * its first page, read fresh; `bind` puts a search's text or a selection into a Page state key once the
 * edits pause, while the kit component shows them at once; `run` runs one of the Plugin's declared
 * Operations, and `optimistic` names nodes, by their keys, and the props each shows until the Operation
 * answers, so a row and its menu change together. A search or selection with no `bind` stays in the App.
 */
export type PageTo<
  State extends PageState,
  Operations = OperationDeclarations,
> = Readonly<{
  go: (path: string) => { action: 'navigate'; path: string };
  set: (change: Partial<State>) => PageStateChange;
  bind: (key: keyof State & string) => PageBind;
  run: <Name extends keyof Operations & string>(
    operation: Name,
    args: OperationArgs<Operations[Name]>,
    options?: { optimistic?: OperationCall['optimistic'] },
  ) => OperationCall;
}>;

export type DefineLoaderPage<Operations = OperationDeclarations> = <
  State extends PageState,
  Data,
  Item extends CrossesAsJson<Item> = never,
>(
  pattern: string,
  page: LoaderPage<State, Data, Item, Operations>,
) => void;

// `argo.pages.define`: a Loader and a pure Render, drawn once per Page address.
export type LoaderPagesApi<Operations = OperationDeclarations> = Readonly<{
  define: DefineLoaderPage<Operations>;
}>;
