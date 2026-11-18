import type { BlobRef } from '@repo/contracts';
import type * as React from 'react';
import { useCallback, useState } from 'react';
import { useImageStepKeys } from '../hooks/use-image-step-keys';
import { type ImageStep, imageBeside } from '../view/feed-images';
import type { FeedViewItem } from '../view/feed-view';
import type { KeyedImage } from '../view/keyed-image';
import { OpenFeedImageContext, OpenImage } from './feed-image';

interface FeedImagesProps {
  items: readonly FeedViewItem[];
  imageUrl: (blob: BlobRef) => string;
  children: React.ReactNode;
}

interface OpenFeedImage {
  // The image last opened, kept while its dialog closes.
  shown: KeyedImage | null;
  open: boolean;
  show: (image: KeyedImage) => void;
  onOpenChange: (open: boolean) => void;
}

function useOpenFeedImage(items: readonly FeedViewItem[]): OpenFeedImage {
  const [shown, setShown] = useState<KeyedImage | null>(null);
  const [open, onOpenChange] = useState(false);

  const show = useCallback((image: KeyedImage): void => {
    setShown(image);
    onOpenChange(true);
  }, []);

  // The Feed's images are read only when a key is pressed, so a Feed with no image open pays nothing for them.
  useImageStepKeys(open, (by: ImageStep): void =>
    setShown((image) => image && imageBeside(items, image, by)),
  );

  return { shown, open, show, onOpenChange };
}

interface ShownImageProps
  extends Omit<OpenFeedImage, 'show'>, Pick<FeedImagesProps, 'imageUrl'> {}

// The image last opened, at its full size; it stays drawn while its dialog closes.
function ShownImage({
  shown,
  imageUrl,
  ...dialog
}: ShownImageProps): React.JSX.Element | null {
  return shown ? (
    <OpenImage
      {...dialog}
      image={shown.image}
      uri={imageUrl(shown.image.blob)}
    />
  ) : null;
}

/*
 * The one open image of a Feed, held above its list: it outlives the row it was opened from, and
 * Left and Right step through every image the loaded Feed holds, drawn or not.
 */
export function FeedImages(props: FeedImagesProps): React.JSX.Element {
  const { show, ...image } = useOpenFeedImage(props.items);

  return (
    <OpenFeedImageContext.Provider value={show}>
      {props.children}
      <ShownImage {...image} imageUrl={props.imageUrl} />
    </OpenFeedImageContext.Provider>
  );
}
