import { type BlobRef, type LinkPreviewData } from '@repo/contracts';
import { gitPreview, gitTarget, type GitTarget } from './github';
import { openGraph, type OpenGraph } from './opengraph';
import { PreviewUnavailable } from './preview-unavailable';
import { previewUrl, type PreviewResponse } from './read-url';
import type { PreviewSources } from './sources';

const imageTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export function fetchPreview(
  sources: PreviewSources,
  href: string,
): Promise<LinkPreviewData | null> {
  const url = previewUrl(href);
  const target = gitTarget(url);

  return target ? fetchGit(sources, target) : fetchWeb(sources, url);
}

async function fetchGit(
  sources: PreviewSources,
  target: GitTarget,
): Promise<LinkPreviewData> {
  const result = gitPreview(target, await sources.github(target.path));
  const avatar = await image(sources, result.avatar);

  return { ...result.preview, avatar };
}

async function fetchWeb(
  sources: PreviewSources,
  url: URL,
): Promise<LinkPreviewData | null> {
  const response = await sources.read(url.href);

  if (!/^text\/html(?:;|$)/i.test(response.type)) return null;
  const data = openGraph(response.bytes.toString('utf8'), response.url);

  return data ? webValue(sources, response.url, data) : null;
}

async function webValue(
  sources: PreviewSources,
  url: string,
  data: OpenGraph,
): Promise<LinkPreviewData> {
  const [cover, icon] = await Promise.all([
    image(sources, data.image),
    image(sources, data.icon),
  ]);

  return { ...webText(url, data), image: cover, icon };
}

async function image(
  sources: PreviewSources,
  href?: string,
): Promise<BlobRef | undefined> {
  if (!href) return undefined;

  return readImage(sources, href).catch(ignoreUnavailable);
}

async function readImage(
  sources: PreviewSources,
  href: string,
): Promise<BlobRef | undefined> {
  const response = await sources.read(previewUrl(href).href);

  return storeImage(sources, response);
}

// An image that cannot be fetched leaves the text card; a fault storing it is not expected, so it surfaces.
function ignoreUnavailable(cause: unknown): undefined {
  if (cause instanceof PreviewUnavailable) return undefined;

  throw cause;
}

async function storeImage(
  sources: PreviewSources,
  response: PreviewResponse,
): Promise<BlobRef | undefined> {
  const type = mediaType(response.type);

  if (!imageTypes.has(type)) return undefined;

  return sources.storeImage(
    new Blob([new Uint8Array(response.bytes)], { type }),
  );
}

function mediaType(header: string): string {
  const [type = ''] = header.split(';');

  return type.trim().toLowerCase();
}

function webText(
  url: string,
  data: OpenGraph,
): Extract<LinkPreviewData, { kind: 'web' }> {
  return {
    kind: 'web',
    title: data.title,
    description: data.description,
    domain: new URL(url).hostname,
  };
}
