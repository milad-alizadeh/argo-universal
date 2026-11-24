import { createContext, useCallback, useContext, useSyncExternalStore } from 'react';
import type { KitProps } from '../../kit-props';

// A Plugin file or remote media the Server resolved, as Video and Audio name it.
export type MediaAsset =
  | KitProps<'Video'>['source']
  | NonNullable<KitProps<'Video'>['poster']>
  | KitProps<'Audio'>['source'];

// A URL, or a story's bundled asset: Metro gives a bundled file as a number.
// `watch` is for a source whose answer arrives later, such as bytes read from the Server: it tells one asset's readers, and no others, to ask again.
export interface MediaUrl {
  (asset: MediaAsset): string | number;
  watch?: (asset: MediaAsset, changed: () => void) => () => void;
}

export const MediaUrlContext = createContext<MediaUrl | null>(null);

// Where Video and Audio load an asset: the Server's asset route, or a story's fixture.
export function useMediaUrl(): MediaUrl {
  const mediaUrl = useContext(MediaUrlContext);

  if (!mediaUrl) throw new Error('useMediaUrl needs a MediaUrlContext');

  return mediaUrl;
}

const nobody = (): void => {};

/*
 * The URL of one asset. When it comes later, only the components that ask for this asset draw again, not every component that reads a media URL.
 */
export function useMediaUri(
  asset: MediaAsset | undefined,
): string | number | undefined {
  const mediaUrl = useMediaUrl();

  const subscribe = useCallback(
    (changed: () => void): (() => void) =>
      asset && mediaUrl.watch ? mediaUrl.watch(asset, changed) : nobody,
    [mediaUrl, asset],
  );

  return useSyncExternalStore(subscribe, () =>
    asset === undefined ? undefined : mediaUrl(asset),
  );
}
