import type * as React from 'react';
import { View } from 'react-native';
import type { KeyedImage } from '../view/keyed-image';
import { FeedImage, type FeedImageSize } from './feed-image';

type StackSize = Extract<FeedImageSize, 'row' | 'stack'>;

interface FeedImageStackProps {
  images: KeyedImage[];
  size: StackSize;
}

const overlap = (size: StackSize, index: number): string | undefined =>
  size === 'stack' && index > 0 ? '-ml-2' : undefined;

// A run of thumbnails at the end of a header row; a group's overlap, a row's sit apart.
function FeedImageStack({
  images,
  size,
}: FeedImageStackProps): React.JSX.Element {
  return (
    <View className={size === 'stack' ? 'flex-row' : 'flex-row gap-1'}>
      {images.map(({ key, image }, index) => (
        <View key={key} className={overlap(size, index)}>
          <FeedImage image={image} imageKey={key} size={size} />
        </View>
      ))}
    </View>
  );
}

// The stack for a header's aside, or none when the calls returned no images.
export function imageStackAside(
  images: KeyedImage[],
  size: StackSize,
): React.JSX.Element | undefined {
  return images.length > 0 ? (
    <FeedImageStack images={images} size={size} />
  ) : undefined;
}
