import type { BlobRef, LinkPreviewData } from '@repo/contracts';
import type { LinkPreviewCardData } from '#primitives/overlays/link-preview';

type ImageUrl = (blob: BlobRef) => string;

export function linkPreviewData(
  data: LinkPreviewData,
  imageUrl: ImageUrl,
): LinkPreviewCardData {
  const image = (blob?: BlobRef): string | undefined =>
    blob ? imageUrl(blob) : undefined;

  return data.kind === 'web'
    ? { ...data, image: image(data.image), icon: image(data.icon) }
    : { ...data, avatar: image(data.avatar) };
}
