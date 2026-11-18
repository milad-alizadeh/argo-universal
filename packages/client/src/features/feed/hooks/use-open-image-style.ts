import type { BlobRef } from '@repo/contracts';
import { useWindowDimensions } from 'react-native';

const openImageWidthFraction = 0.9;

const openImageHeightFraction = 0.8;

function aspectRatioOf({ width, height }: BlobRef): number {
  if (!width || !height) return 1;

  return width / height;
}

type OpenImageSize = { width: number; aspectRatio: number };

// An open image fills most of the window, as wide as its shape lets it be within the window's height.
export function useOpenImageStyle(blob: BlobRef): OpenImageSize {
  const window = useWindowDimensions();
  const aspectRatio = aspectRatioOf(blob);

  const width = Math.min(
    window.width * openImageWidthFraction,
    window.height * openImageHeightFraction * aspectRatio,
  );

  return { width, aspectRatio };
}
