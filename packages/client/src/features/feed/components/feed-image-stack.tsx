import type { ImageContent } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { FeedImage, type FeedImageSize } from './feed-image';

type StackSize = Extract<FeedImageSize, 'row' | 'stack'>;

interface FeedImageStackProps {
  images: ImageContent[];
  size: StackSize;
}

// A call's images, keyed by the Blob and the call's own order, since one read may repeat an image.
const imageKeys = (images: ImageContent[]): string[] =>
  images.map((image, index) => `${index}:${image.blob.blobId}`);

const overlap = (size: StackSize, index: number): string | undefined =>
  size === 'stack' && index > 0 ? '-ml-2' : undefined;

// A run of thumbnails at the end of a header row; a group's overlap, a row's sit apart.
function FeedImageStack({
  images,
  size,
}: FeedImageStackProps): React.JSX.Element {
  const keys = imageKeys(images);

  return (
    <View className={size === 'stack' ? 'flex-row' : 'flex-row gap-1'}>
      {images.map((image, index) => (
        <View key={keys[index]} className={overlap(size, index)}>
          <FeedImage image={image} size={size} />
        </View>
      ))}
    </View>
  );
}

// The stack for a header's aside, or none when the calls returned no images.
export function imageStackAside(
  images: ImageContent[],
  size: StackSize,
): React.JSX.Element | undefined {
  return images.length > 0 ? (
    <FeedImageStack images={images} size={size} />
  ) : undefined;
}
