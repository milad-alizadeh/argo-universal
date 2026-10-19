import { createContext, useContext } from 'react';
import type { KitProps } from '../../kit-props';

// A Plugin file or remote media the Server resolved, as Video and Audio name it.
export type MediaAsset =
  | KitProps<'Video'>['source']
  | NonNullable<KitProps<'Video'>['poster']>
  | KitProps<'Audio'>['source'];

// A URL, or a story's bundled asset: Metro gives a bundled file as a number.
export type MediaUrl = (asset: MediaAsset) => string | number;

export const MediaUrlContext = createContext<MediaUrl | null>(null);

// Where Video and Audio load an asset: the Server's asset route, or a story's fixture.
export function useMediaUrl(): MediaUrl {
  const mediaUrl = useContext(MediaUrlContext);

  if (!mediaUrl) throw new Error('useMediaUrl needs a MediaUrlContext');

  return mediaUrl;
}
