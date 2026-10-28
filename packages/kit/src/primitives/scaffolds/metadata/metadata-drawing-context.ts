import { createContext, use, useMemo } from 'react';
import { useListLook } from '../../../list-look-context';
import {
  metadataDrawing,
  type MetadataDrawing,
  type MetadataWidth,
} from './metadata-drawing';

/*
 * How much room a Detail gives its Metadata. List look knows the window's width, not this container's: only the
 * Detail's measured columns know whether the Metadata has a column of its own.
 */
export const MetadataWidthContext = createContext<MetadataWidth>('column');

// The one place a Metadata drawing is resolved: from the List look it sits in and the room it has.
export function useResolvedMetadataDrawing(
  width: MetadataWidth,
): MetadataDrawing {
  const { fieldRows, inList } = useListLook();

  return useMemo(
    () => metadataDrawing({ platform: fieldRows, inList, width }),
    [fieldRows, inList, width],
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
