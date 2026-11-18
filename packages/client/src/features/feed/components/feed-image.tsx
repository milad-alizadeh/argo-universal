import type { BlobRef, ImageContent } from '@repo/contracts';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@repo/kit/primitives/overlays/dialog';
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { Image, Pressable, useWindowDimensions, View } from 'react-native';

type ImageUrl = (blob: BlobRef) => string;

export const FeedImageUrlContext = createContext<ImageUrl | null>(null);

const openImageWidthFraction = 0.9;

const openImageHeightFraction = 0.8;

const isPasted = (image: ImageContent): boolean =>
  image._meta?.argo?.source === 'pasted';

function sizeLabel({ width, height }: BlobRef): string | undefined {
  if (!width || !height) return undefined;

  return `${width}×${height}`;
}

const imageLabel = (image: ImageContent): string | undefined =>
  image.name ?? (isPasted(image) ? 'Pasted' : sizeLabel(image.blob));

function aspectRatioOf({ width, height }: BlobRef): number {
  if (!width || !height) return 1;

  return width / height;
}

function useImageUrl(imageUrl: ImageUrl | undefined): ImageUrl {
  const feedImageUrl = useContext(FeedImageUrlContext);
  const loadImage = imageUrl ?? feedImageUrl;

  if (!loadImage)
    throw new Error('Feed images need the Server Blob URL resolver.');

  return loadImage;
}

type OpenImageSize = { width: number; aspectRatio: number };

function useOpenImageStyle(blob: BlobRef): OpenImageSize {
  const window = useWindowDimensions();
  const aspectRatio = aspectRatioOf(blob);

  const width = Math.min(
    window.width * openImageWidthFraction,
    window.height * openImageHeightFraction * aspectRatio,
  );

  return { width, aspectRatio };
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

function OpenImage({
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
  imageUrl?: ImageUrl;
  size?: FeedImageSize;
}

export function FeedImage({
  image,
  imageUrl,
  size = 'feed',
}: FeedImageProps): React.JSX.Element {
  const uri = useImageUrl(imageUrl)(image.blob);
  const [open, setOpen] = useState(false);
  const source = { image, uri };

  return (
    <>
      <ImageThumbnail {...source} size={size} onPress={() => setOpen(true)} />
      <OpenImage open={open} onOpenChange={setOpen} image={image} uri={uri} />
    </>
  );
}
