import type { ContentBlock, ImageContent } from '@repo/contracts';

// An image the Feed holds, keyed by its row and its place in that row's content: drawn twice, it is still one image.
export interface KeyedImage {
  key: string;
  image: ImageContent;
}

export const imageKeyAt = (rowId: string, index: number): string =>
  `${rowId}:${index}`;

// The images among a row's content blocks, in the order it holds them.
export const contentImages = (
  rowId: string,
  content: readonly ContentBlock[],
): KeyedImage[] =>
  content.flatMap((block, index) =>
    block.type === 'image'
      ? [{ key: imageKeyAt(rowId, index), image: block }]
      : [],
  );
