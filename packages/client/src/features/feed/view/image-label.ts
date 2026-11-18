import type { BlobRef, ImageContent } from '@repo/contracts';

const isPasted = (image: ImageContent): boolean =>
  image._meta?.argo?.source === 'pasted';

function sizeLabel({ width, height }: BlobRef): string | undefined {
  if (!width || !height) return undefined;

  return `${width}×${height}`;
}

// What names an image in the Feed: its filename, else that it was pasted, else its size.
export const imageLabel = (image: ImageContent): string | undefined =>
  image.name ?? (isPasted(image) ? 'Pasted' : sizeLabel(image.blob));
