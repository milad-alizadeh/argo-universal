import { z } from 'zod';
import { PluginOperationName, PluginOperationParams } from '#plugin-operations';
import { PageStateValue } from '#plugin-wire-action';
import { WireJson } from '#plugin-wire-json';

/*
 * A Loader page's address (ADR-0050): the Plugin, the Page path, the Page state and the context it opens
 * for. One address always draws the same Plugin tree from the same reads, so the App keys its cache by it.
 */
// Scalars and selections only, so an address stays a flat cache key.
export const PageState = z.record(z.string(), PageStateValue);

export type PageState = z.infer<typeof PageState>;

export const PageAddress = z.strictObject({
  pluginId: z.string().min(1),
  path: z.string().startsWith('/'),
  pageState: PageState,
  projectId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
});

export type PageAddress = z.infer<typeof PageAddress>;

// An Operation a Loader page's Component event runs, for the Project and Session the page opened for.
export const PageRun = z.strictObject({
  pluginId: z.string().min(1),
  operation: PluginOperationName,
  args: PluginOperationParams,
  projectId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
});

export type PageRun = z.infer<typeof PageRun>;

/*
 * What the Operation answered and the Page path patterns whose Plugin trees it may have changed: the
 * App draws again every open address whose path one of them matches.
 */
export const PageRunAnswer = z.strictObject({
  result: WireJson,
  stale: z.array(z.string()),
});

export type PageRunAnswer = z.infer<typeof PageRunAnswer>;

/*
 * A stale mark the Server pushes to every connected App after one of the Plugin's Operations ran, from
 * a Component event, an Agent or the CLI: the App draws again the kept addresses it has on screen.
 */
export const StaleMark = z.strictObject({
  pluginId: z.string().min(1),
  stale: z.array(z.string()),
});

export type StaleMark = z.infer<typeof StaleMark>;

// The worker's side of a draw: the tree it drew and the pages its list shows, why it could not, or a pattern it defined.
export const LoaderPageCall = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('drawn'),
    id: z.number().int().nonnegative(),
    root: WireJson,
    pages: z.number().int().nonnegative(),
  }),
  z.strictObject({
    action: z.literal('failed'),
    id: z.number().int().nonnegative(),
    error: z.string(),
  }),
  z.strictObject({ action: z.literal('defined'), pattern: z.string() }),
  z.strictObject({ action: z.literal('stale') }),
]);

export type LoaderPageCall = z.infer<typeof LoaderPageCall>;

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

type Pair = [segment: string, value: string];

const paramsOf = (pairs: Pair[]): Record<string, string> =>
  Object.fromEntries(
    pairs.flatMap(([segment, value]) =>
      segment.startsWith(':') ? [[segment.slice(1), value]] : [],
    ),
  );

const segmentFits = (segment: string, value: string): boolean =>
  segment.startsWith(':') || segment === value;
