import type { BlobRef, ImageContent } from '@repo/contracts';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@repo/kit/primitives/overlays/dialog';
import type * as React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
} from 'react';
import { Image, Pressable, View } from 'react-native';
import { useOpenImageStyle } from '../hooks/use-open-image-style';
import { imageLabel } from '../view/image-label';
import type { KeyedImage } from '../view/keyed-image';

// `watch` is there when an image's URL arrives later: it tells the readers of that one Blob, and no others, to ask again.
export interface ImageUrl {
  (blob: BlobRef): string;
  watch?: (blob: BlobRef, changed: () => void) => () => void;
}

export const FeedImageUrlContext = createContext<ImageUrl | null>(null);

// Opens an image over the Feed it is drawn in; null where an image is drawn outside a Feed.
export const OpenFeedImageContext = createContext<
  ((image: KeyedImage) => void) | null
>(null);

function useImageUrl(imageUrl: ImageUrl | undefined): ImageUrl {
  const feedImageUrl = useContext(FeedImageUrlContext);
  const loadImage = imageUrl ?? feedImageUrl;

  if (!loadImage)
    throw new Error('Feed images need the Server Blob URL resolver.');

  return loadImage;
}

const nobody = (): void => {};

// One image's URL. When it arrives, only the images of this Blob draw again, not every row of the Feed.
function useBlobUri(loadImage: ImageUrl, image: ImageContent): string {
  const { blob } = image;

  const subscribe = useCallback(
    (changed: () => void): (() => void) =>
      loadImage.watch?.(blob, changed) ?? nobody,
    [loadImage, blob],
  );

  return useSyncExternalStore(subscribe, () => loadImage(blob));
}

interface ImageSourceProps {
  image: ImageContent;
  uri: string;
}

function FullImage({ image, uri }: ImageSourceProps): React.JSX.Element {
  const label = imageLabel(image) ?? 'Image';

  return (
    <>
      <DialogTitle className="sr-only">{label}</DialogTitle>
      <Image
        source={{ uri }}
        resizeMode="contain"
        accessibilityLabel={label}
        style={useOpenImageStyle(image.blob)}
      />
    </>
  );
}

interface OpenImageProps extends ImageSourceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// One image at its full size, over the page; its title and label follow the image it is given.
export function OpenImage({
  image,
  uri,
  ...dialog
}: OpenImageProps): React.JSX.Element {
  return (
    <Dialog {...dialog}>
      <DialogContent className="w-auto min-w-0 gap-0 overflow-hidden p-0 sm:max-w-none">
        <FullImage image={image} uri={uri} />
      </DialogContent>
    </Dialog>
  );
}

// `feed` sits in a message; `row` ends a Tool call row; `stack` overlaps in a group header.
export type FeedImageSize = 'feed' | 'row' | 'stack';

interface ThumbnailProps extends ImageSourceProps {
  size: FeedImageSize;
  onPress: () => void;
}

// A stack's card ring keeps overlapping thumbnails apart; the hairline edge sits inside it.
const thumbnailClassNames: Record<FeedImageSize, string> = {
  feed: 'h-21 w-30 rounded-lg',
  row: 'size-6 rounded-sm',
  stack: 'size-5.5 rounded-sm border-2 border-card',
};

// Every image thumbnail draws a hairline over its edge, so a white image still shows where it ends.
const edgeClassNames: Record<FeedImageSize, string> = {
  feed: 'rounded-lg',
  row: 'rounded-sm',
  stack: 'rounded-xs',
};

const edgeClassName = (size: FeedImageSize): string =>
  `pointer-events-none absolute inset-0 border border-border ${edgeClassNames[size]}`;

const thumbnailClassName = (size: FeedImageSize): string =>
  `shrink-0 overflow-hidden bg-muted ${thumbnailClassNames[size]}`;

function thumbnailLabel(image: ImageContent): string {
  const label = imageLabel(image);

  return label ? `Open image, ${label}` : 'Open image';
}

function ImageThumbnail(props: ThumbnailProps): React.JSX.Element {
  const source = { uri: props.uri };

  return (
    <Pressable
      role="button"
      aria-label={thumbnailLabel(props.image)}
      onPress={props.onPress}
      className={thumbnailClassName(props.size)}
    >
      <Image source={source} resizeMode="cover" className="size-full" />
      <View aria-hidden className={edgeClassName(props.size)} />
    </Pressable>
  );
}

interface FeedImageProps {
  image: ImageContent;
  // Where the Feed holds the image, so it opens among the Feed's other images; without one it opens alone.
  imageKey?: string;
  imageUrl?: ImageUrl;
  size?: FeedImageSize;
}

type ThumbnailSource = Omit<ThumbnailProps, 'onPress'>;

// An image drawn outside a Feed, or one the Feed does not list, opens in a dialog of its own.
function LoneImage(props: ThumbnailSource): React.JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ImageThumbnail {...props} onPress={() => setOpen(true)} />
      <OpenImage
        open={open}
        onOpenChange={setOpen}
        image={props.image}
        uri={props.uri}
      />
    </>
  );
}

// The Feed's opener for a listed image, or none for one that opens alone.
function useOpenInFeed(
  image: ImageContent,
  key: string | undefined,
): (() => void) | undefined {
  const openInFeed = useContext(OpenFeedImageContext);

  if (!openInFeed || key === undefined) return undefined;

  return () => openInFeed({ key, image });
}

export function FeedImage({
  image,
  imageKey,
  imageUrl,
  size = 'feed',
}: FeedImageProps): React.JSX.Element {
  const openInFeed = useOpenInFeed(image, imageKey);
  const source = { image, uri: useBlobUri(useImageUrl(imageUrl), image), size };

  return openInFeed ? (
    <ImageThumbnail {...source} onPress={openInFeed} />
  ) : (
    <LoneImage {...source} />
  );
}
