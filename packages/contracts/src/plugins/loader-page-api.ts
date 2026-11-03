import type { ReactNode } from 'react';
import type { PluginRenderContext } from './kit';
import type { PageState } from './page-address';
import type { PluginOperationParams } from './plugin-operations';
import type { OperationCall, PageStateChange } from './wire-action';

/*
 * A Loader page (ADR-0050), as `argo.pages.define(pattern, page)` takes it. Every draw runs `load` and
 * then `render`, once, in that order, for one Page address:
 *
 * - `state` holds the Page state's defaults; the address's Page state is merged over them, so a key the
 *   App never set reads its default.
 * - `load` reads everything the page shows. It may be slow; the App keeps the previous Plugin tree on
 *   screen until the next one lands. What it throws fails the draw, and the App says so.
 * - `render` is pure: no hooks, no effects, no function props. A Component event holds a value made by
 *   `to`, which the App acts on itself; a function prop fails the draw.
 */
export type LoaderPage<State extends PageState, Data> = Readonly<{
  state?: State;
  load: (input: LoaderInput<State>) => Data | Promise<Data>;
  render: (
    data: Data,
    to: PageTo<State>,
    input: LoaderInput<State>,
  ) => ReactNode;
}>;

// What one draw is for: the pattern's `:params` from the Page path, the Page state, and the page's context.
export type LoaderInput<State extends PageState> = Readonly<{
  params: Readonly<Record<string, string>>;
  state: Readonly<State>;
  context: PluginRenderContext;
}>;

/*
 * The values a Render puts in its Component events. `go` opens another Page path; `set` merges a change
 * into the Page state and draws the new address, and an empty change draws the same address again from
 * fresh reads; `run` runs one of the Plugin's declared Operations, and `optimistic` names nodes, by their
 * keys, and the props each shows until the Operation answers, so a row and its menu change together.
 */
export type PageTo<State extends PageState> = Readonly<{
  go: (path: string) => { action: 'navigate'; path: string };
  set: (change: Partial<State>) => PageStateChange;
  run: (
    operation: string,
    args: PluginOperationParams,
    options?: { optimistic?: OperationCall['optimistic'] },
  ) => OperationCall;
}>;

export type DefineLoaderPage = <State extends PageState, Data>(
  pattern: string,
  page: LoaderPage<State, Data>,
) => void;

// `argo.pages.define`: a Loader and a pure Render, drawn once per Page address.
export type LoaderPagesApi = Readonly<{ define: DefineLoaderPage }>;
