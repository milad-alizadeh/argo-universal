import { LinkPreviewData, LinkPreviewInput } from '@repo/contracts';
import { publicProcedure, router, routerFactory } from '../rpc';
import { PreviewCache } from './cache';
import { fetchPreview } from './fetch-preview';
import { previewUrl } from './read-url';
import type { PreviewSources } from './sources';

export const createLinkPreviewRouter = routerFactory(
  (sources: PreviewSources) => {
    const cache = new PreviewCache((href) => fetchPreview(sources, href));

    return router({
      get: publicProcedure
        .input(LinkPreviewInput)
        .output(LinkPreviewData.nullable())
        .query(({ input }) => get(cache, input.href)),
    });
  },
);

async function get(
  cache: PreviewCache,
  href: string,
): Promise<LinkPreviewData | null> {
  try {
    return await cache.get(previewUrl(href).href);
  } catch {
    return null;
  }
}
