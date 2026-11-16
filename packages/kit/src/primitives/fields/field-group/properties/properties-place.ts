import { createContext, use, useMemo } from 'react';
import { AsidePlaceContext } from '#kit/aside-place-context';
import { useListLook } from '#kit/list-look-context';
import {
  propertiesDrawing,
  type PropertiesDrawing,
} from './properties-drawing';

// The one place a read-only FieldGroup's drawing is resolved: from the List look it sits in and where the aside put it.
export function useResolvedPropertiesDrawing(): PropertiesDrawing {
  const { fieldRows, inList } = useListLook();
  const place = use(AsidePlaceContext);

  return useMemo(
    () => propertiesDrawing({ platform: fieldRows, inList, place }),
    [fieldRows, inList, place],
  );
}

// The drawing a read-only FieldGroup resolved, handed to its fields.
export const PropertiesDrawingContext = createContext<PropertiesDrawing | null>(
  null,
);

// A field draws in its FieldGroup's drawing; outside a read-only FieldGroup it has none to draw in.
export function usePropertiesDrawing(): PropertiesDrawing {
  const drawing = use(PropertiesDrawingContext);

  if (!drawing)
    throw new Error(
      'A property field draws only inside a read-only FieldGroup.',
    );

  return drawing;
}
