import { createContext, use, useMemo } from 'react';
import { useListLook } from '../../../list-look-context';
import type { AsidePlace } from '../screen/screen-aside-place';
import { metadataDrawing, type MetadataDrawing } from './metadata-drawing';

/*
 * Where a Screen's aside put its Metadata. List look knows the window's width, not the Screen's: only the Screen's
 * measured width knows whether the aside has a column of its own.
 */
export const MetadataPlaceContext = createContext<AsidePlace | null>(null);

// The one place a Metadata drawing is resolved: from the List look it sits in and where the aside put it.
export function useResolvedMetadataDrawing(): MetadataDrawing {
  const { fieldRows, inList } = useListLook();
  const place = use(MetadataPlaceContext);

  return useMemo(
    () => metadataDrawing({ platform: fieldRows, inList, place }),
    [fieldRows, inList, place],
  );
}

// The drawing a Metadata root resolved, handed to its fields.
export const MetadataDrawingContext = createContext<MetadataDrawing | null>(
  null,
);

// A field draws in its Metadata's drawing; outside a Metadata it has none to draw in.
export function useMetadataDrawing(): MetadataDrawing {
  const drawing = use(MetadataDrawingContext);

  if (!drawing) throw new Error('A Metadata field draws only inside Metadata.');

  return drawing;
}
