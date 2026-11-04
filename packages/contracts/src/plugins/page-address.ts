import { z } from 'zod';
import {
  PluginOperationName,
  PluginOperationParams,
  WorkerCallFailed,
} from '#plugin-operations';
import { PageStateValue } from '#plugin-wire-action';
import { WireJson } from '#plugin-wire-json';

/*
 * A Loader page's address (ADR-0050): the Plugin, the Page path, the Page state and the context it opens
 * for. One address always draws the same Plugin tree from the same reads, so the App keys its cache by it.
 */
// Scalars and selections only, so an address stays a flat cache key.
export const PageState = z.record(z.string(), PageStateValue);

export type PageState = z.infer<typeof PageState>;

// The longest Page path an App may ask a Plugin for, which the Server logs when the page fails.
export const maxPagePathLength = 512;

// The Project and Session a page or a run is for, each when it has one.
const scope = {
  projectId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
};

export type PageScope = { projectId?: string; sessionId?: string };

export const PageAddress = z.strictObject({
  pluginId: z.string().min(1),
  path: z.string().startsWith('/').max(maxPagePathLength),
  pageState: PageState,
  ...scope,
});

export type PageAddress = z.infer<typeof PageAddress>;

// A drawn page: its tree, how many pages of its paged list it shows, and `live` when its Loader yields.
export type DrawnTree<Root = WireJson> = {
  root: Root;
  pages: number;
  live?: true;
};

// An Operation a Loader page's Component event runs, for the Project and Session the page opened for.
export const PageRun = z.strictObject({
  pluginId: z.string().min(1),
  operation: PluginOperationName,
  args: PluginOperationParams,
  ...scope,
});

export type PageRun = z.infer<typeof PageRun>;

// What the Operation answered; the trees it changed hear of it from the stale mark it makes.
export const PageRunAnswer = z.strictObject({ result: WireJson });

export type PageRunAnswer = z.infer<typeof PageRunAnswer>;

/*
 * A stale mark the Server pushes to every connected App. A write, which is one of the Plugin's Operations
 * run from a Component event, an Agent or the CLI, or the Plugin's `argo.changed()`, marks every address
 * of the Plugin and names none. A Query whose kept answer changed with no write, as when a background pass
 * reads it again, names the addresses whose last draw read it. The App draws again the marked addresses
 * it has on screen.
 */
export const StaleMark = z.strictObject({
  pluginId: z.string().min(1),
  addresses: z.array(PageAddress).optional(),
});

export type StaleMark = z.infer<typeof StaleMark>;

/*
 * The worker's side of a draw: the tree it drew and the pages its list shows, a background load done, why
 * it could not, a pattern it defined with the interval its page asks to be drawn again on, or
 * `argo.changed()`. A drawn tree from a Loader that yields is `live`. A live draw sends each tree its
 * Loader yields as a `frame` and answers `ended` once the Loader stops.
 */
export const LoaderPageCall = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('drawn'),
    id: z.number().int().nonnegative(),
    root: WireJson,
    pages: z.number().int().nonnegative(),
    live: z.literal(true).optional(),
  }),
  z.strictObject({
    action: z.literal('frame'),
    id: z.number().int().nonnegative(),
    root: WireJson,
  }),
  z.strictObject({
    action: z.literal('ended'),
    id: z.number().int().nonnegative(),
  }),
  z.strictObject({
    action: z.literal('failed'),
    id: z.number().int().nonnegative(),
    error: z.string(),
  }),
  // A background pass's Loader read and answered; its answer stays in the worker.
  z.strictObject({
    action: z.literal('loaded'),
    id: z.number().int().nonnegative(),
  }),
  z.strictObject({
    action: z.literal('defined'),
    pattern: z.string(),
    every: z.number().int().positive().optional(),
  }),
  // `argo.changed()`: what the Plugin's pages and items Slots show may have changed.
  z.strictObject({ action: z.literal('changed') }),
]);

export type LoaderPageCall = z.infer<typeof LoaderPageCall>;

// The Plugin's answer to one named read Argo asked it to run, by the read's id.
export const QueryReadAnswer = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('read'),
    id: z.number().int().nonnegative(),
    value: WireJson,
  }),
  WorkerCallFailed,
]);

export type QueryReadAnswer = z.infer<typeof QueryReadAnswer>;

// A worker's calls for its Loader pages, by the runtime api each crosses on.
export const LoaderRequest = z.discriminatedUnion('api', [
  z.object({ api: z.literal('pages'), call: LoaderPageCall }),
  z.object({ api: z.literal('reads'), call: QueryReadAnswer }),
]);

const segmentsOf = (path: string): string[] =>
  path.split('/').filter((segment) => segment.length > 0);

/*
 * A Page path pattern's params for a path it matches, or null. A `:name` segment matches any one
 * segment and names it; every other segment matches itself.
 */
export function matchPagePath(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const wanted = segmentsOf(pattern);
  const given = segmentsOf(path);

  if (wanted.length !== given.length) return null;

  const pairs = wanted.map((segment, index): Pair => [
    segment,
    given[index] ?? '',
  ]);

  if (!pairs.every(([segment, value]) => segmentFits(segment, value)))
    return null;

  return paramsOf(pairs);
}

// Whether any of the patterns matches the path.
export const matchesAnyPagePath = (
  patterns: readonly string[],
  path: string,
): boolean => patterns.some((pattern) => matchPagePath(pattern, path) !== null);

type Pair = [segment: string, value: string];

const paramsOf = (pairs: Pair[]): Record<string, string> =>
  Object.fromEntries(
    pairs.flatMap(([segment, value]) =>
      segment.startsWith(':') ? [[segment.slice(1), value]] : [],
    ),
  );

const segmentFits = (segment: string, value: string): boolean =>
  segment.startsWith(':') || segment === value;
