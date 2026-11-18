import type { FeedViewItem } from './feed-view';
import { contentImages, type KeyedImage } from './keyed-image';
import { type FeedRow, isMessage } from './message-row';
import { activityImages, groupImages } from './tool-call-images';

const rowImages = (row: FeedRow): KeyedImage[] =>
  isMessage(row) ? contentImages(row.id, row.content) : [];

type ImagesOf = (item: FeedViewItem) => KeyedImage[];

// Each kind of item that holds images: a message, a child's reply, a result sent to the parent, and Tool calls alone or grouped.
const imageSources: ImagesOf[] = [
  (item) => (item.type === 'row' ? rowImages(item.row) : []),
  (item) =>
    item.type === 'child_reply'
      ? contentImages(item.row.id, item.row.content)
      : [],
  (item) =>
    item.type === 'parent_result' ? contentImages(item.id, item.content) : [],
  (item) => (item.type === 'group' ? groupImages(item) : []),
  (item) =>
    item.type === 'tool_call' || item.type === 'exploration'
      ? activityImages(item)
      : [],
];

const itemImages: ImagesOf = (item) =>
  imageSources.flatMap((imagesOf) => imagesOf(item));

// Every image the loaded Feed holds, once each and in Feed order: what Left and Right step through while one is open.
export const feedImages = (items: readonly FeedViewItem[]): KeyedImage[] =>
  items.flatMap(itemImages);

// Which way an arrow key steps: back to the image before, or on to the one after.
export type ImageStep = -1 | 1;

// The image `by` places from `open` in the Feed, or `open` itself at either end and once the Feed no longer holds it.
export function imageBeside(
  items: readonly FeedViewItem[],
  open: KeyedImage,
  by: ImageStep,
): KeyedImage {
  const images = feedImages(items);
  const index = images.findIndex((image) => image.key === open.key);

  return (index === -1 ? undefined : images[index + by]) ?? open;
}
