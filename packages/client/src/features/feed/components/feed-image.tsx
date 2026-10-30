import type { BlobRef, ImageContent } from '@repo/contracts';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@repo/kit/primitives/overlays/dialog';
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { Image, Pressable, useWindowDimensions } from 'react-native';

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

interface ThumbnailProps extends ImageSourceProps {
  onPress: () => void;
}

const thumbnailClassName =
  'h-21 w-30 shrink-0 overflow-hidden rounded-lg border border-border bg-muted';

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
      className={thumbnailClassName}
    >
      <Image source={source} resizeMode="cover" className="size-full" />
    </Pressable>
  );
}

interface FeedImageProps {
  image: ImageContent;
  imageUrl?: ImageUrl;
}

export function FeedImage({
  image,
  imageUrl,
}: FeedImageProps): React.JSX.Element {
  const uri = useImageUrl(imageUrl)(image.blob);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ImageThumbnail image={image} uri={uri} onPress={() => setOpen(true)} />
      <OpenImage open={open} onOpenChange={setOpen} image={image} uri={uri} />
    </>
  );
}
