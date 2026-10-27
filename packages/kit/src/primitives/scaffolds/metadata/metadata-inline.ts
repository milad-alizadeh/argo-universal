import { createContext, useContext } from 'react';

/*
 * A Detail too narrow for its Metadata column on desktop or web draws its Metadata inline: one wrapping line of values
 * under the Screen's title, each field's label kept as its spoken name. Phones keep their own stacked Metadata.
 */
export const MetadataInlineContext = createContext(false);

export const useMetadataInline = (): boolean =>
  useContext(MetadataInlineContext);
