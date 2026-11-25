import type { BlobRef, LinkPreviewData } from '@repo/contracts';
import type { LinkPreviewCardData } from '@repo/kit/primitives/overlays/link-preview';

// `preload` is there when a URL arrives later: a card is drawn once, so it cannot watch, but it can ask for the image to be read.
interface ImageUrl {
  (blob: BlobRef): string;
  preload?: (blob: BlobRef) => void;
}

export function linkPreviewData(
  data: LinkPreviewData,
  imageUrl: ImageUrl,
): LinkPreviewCardData {
  const image = (blob?: BlobRef): string | undefined => {
    if (!blob) return undefined;
    imageUrl.preload?.(blob);

    return imageUrl(blob);
  };

  return data.kind === 'web'
    ? { ...data, image: image(data.image), icon: image(data.icon) }
    : { ...data, avatar: image(data.avatar) };
}
