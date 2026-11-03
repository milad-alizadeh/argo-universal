import { matchPagePath } from '@repo/contracts/plugins/page-address';
import { Action, type WireNode } from '@repo/contracts/plugins/wire';
import { useEffect } from 'react';
import { drawOptions, useDrawing, type Drawing } from './draw-cache';
import { rememberedState } from './page-state-memory';
import { useLoaderPatterns } from './use-loader-paths';
import type { PageOpening } from './use-page-calls';

// How many of a page's first links to Loader pages are drawn ahead of a tap.
const prefetched = 4;

// A kept tree this young draws without asking again, so a prefetched page is not read twice on the tap.
export const freshMs = 5_000;

/*
 * Draws ahead the Loader pages the first few links on a page open, so a tap paints from the cache. Only
 * an address with no tree is drawn, even a stale one is left: it draws at once on the tap and its screen
 * asks again then, so neither a redraw of this page nor a write reads every link again. Only links to
 * Loader pages can be drawn ahead; a view page is still a live stream opened on the tap.
 */
export function usePrefetch(opening: PageOpening, root: WireNode | null): void {
  const drawing = useDrawing();

  const { data: patterns } = useLoaderPatterns(opening.pluginId);
  const { pluginId, projectId, sessionId } = opening;
  const { client, draws, ask } = drawing;

  useEffect(() => {
    for (const path of loaderLinks(root, patterns ?? [])) {
      const page = { pluginId, path, projectId, sessionId };
      const pageState = rememberedState(client, page);

      drawAhead({ client, draws, ask }, { ...page, pageState });
    }
  }, [client, draws, ask, pluginId, projectId, sessionId, root, patterns]);
}

function drawAhead(
  drawing: Drawing,
  address: Parameters<typeof drawOptions>[1],
): void {
  const options = drawOptions(drawing, address);

  if (drawing.client.getQueryData(options.queryKey) === undefined)
    void drawing.client.prefetchQuery(options);
}

function loaderLinks(root: WireNode | null, patterns: string[]): string[] {
  const paths = root ? linksOf(root) : [];

  const loaders = paths.filter((path) =>
    patterns.some((pattern) => matchPagePath(pattern, path) !== null),
  );

  return [...new Set(loaders)].slice(0, prefetched);
}

// A node's `navigate` onPress, then its slots' and children's, in drawing order.
const linksOf = (node: WireNode): string[] => [
  ...navigateOf(node),
  ...Object.values(node.slots).flat().flatMap(linksOf),
  ...node.children.flatMap(linksOf),
];

function navigateOf(node: WireNode): string[] {
  const action = Action.safeParse(node.props.onPress);

  return action.success && action.data.action === 'navigate'
    ? [action.data.path]
    : [];
}
