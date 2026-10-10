import type { BlobRef, ImageContent } from '@repo/contracts';
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { Image, Pressable, useWindowDimensions } from 'react-native';
import { Dialog, DialogContent, DialogTitle } from '#primitives/dialog';

export const FeedImageUrlContext = createContext<
  ((blob: BlobRef) => string) | null
>(null);
const openImageWidthFraction = 0.9;
const openImageHeightFraction = 0.8;

function imageLabel(image: ImageContent): string | undefined {
  if (image._meta?.argo?.source === 'pasted') return 'Pasted';
  const { width, height } = image.blob;
  return width && height ? `${width}×${height}` : undefined;
}

export function FeedImage({
  image,
  imageUrl,
}: {
  image: ImageContent;
  imageUrl?: (blob: BlobRef) => string;
}): React.JSX.Element {
  const feedImageUrl = useContext(FeedImageUrlContext);
  const loadImage = imageUrl ?? feedImageUrl;
  if (!loadImage)
    throw new Error('Feed images need the Server Blob URL resolver.');
  const [open, setOpen] = useState(false);
  const window = useWindowDimensions();
  const label = imageLabel(image);
  const aspectRatio =
    image.blob.width && image.blob.height
      ? image.blob.width / image.blob.height
      : 1;
  const width = Math.min(
    window.width * openImageWidthFraction,
    window.height * openImageHeightFraction * aspectRatio,
  );
  const source = { uri: loadImage(image.blob) };
  return (
    <>
      <Pressable
        role="button"
        aria-label={label ? `Open image, ${label}` : 'Open image'}
        onPress={() => setOpen(true)}
        className="h-[84px] w-[120px] shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
      >
        <Image source={source} resizeMode="cover" className="size-full" />
      </Pressable>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-auto gap-0 overflow-hidden p-0 sm:max-w-none">
          <DialogTitle className="sr-only">{label ?? 'Image'}</DialogTitle>
          <Image
            source={source}
            resizeMode="contain"
            accessibilityLabel={label ?? 'Image'}
            style={{ width, aspectRatio }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
