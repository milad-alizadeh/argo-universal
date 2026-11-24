import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
} from 'react';
import type { KitProps } from '../../kit-props';

// A Plugin file or remote media the Server resolved, as Video and Audio name it.
export type MediaAsset =
  | KitProps<'Video'>['source']
  | NonNullable<KitProps<'Video'>['poster']>
  | KitProps<'Audio'>['source'];

/*
 * A URL, or a story's bundled asset: Metro gives a bundled file as a number.
 * `watch` is for a source whose answer arrives later, such as bytes read from the Server: it tells the readers of one asset, and no others, to ask again. The source names an asset with `keyOf` and `watch` takes that name, so two objects for one asset are one subscription.
 */
export interface MediaUrl {
  (asset: MediaAsset): string | number;
  keyOf?: (asset: MediaAsset) => string;
  watch?: (key: string, changed: () => void) => () => void;
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
  // An asset is a new object on each render; the source's own name for it is what keeps the subscription.
  const key = asset === undefined ? undefined : mediaUrl.keyOf?.(asset);

  const subscribe = useCallback(
    (changed: () => void): (() => void) =>
      key !== undefined && mediaUrl.watch
        ? mediaUrl.watch(key, changed)
        : nobody,
    [mediaUrl, key],
  );

  // Reading the URL starts nothing: watching does.
  return useSyncExternalStore(subscribe, () =>
    asset === undefined ? undefined : mediaUrl(asset),
  );
}
