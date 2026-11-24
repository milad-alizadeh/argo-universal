import { bytesBase64 } from './bytes';

/*
 * Where the bytes of a Server's Blobs and Plugin assets are kept once they have come over the channel. A Blob never changes, so a kept copy is never stale.
 * `find` answers at once with a URL an image can draw from, or null when nothing is kept; `keep` stores the bytes and answers with that URL.
 */
export interface MediaStore {
  find: (path: string) => string | null;
  keep: (path: string, bytes: Uint8Array, mime: string) => Promise<string>;
}

// Web has no file system to write to, so what arrives is held as data URIs until the page closes. Native Apps keep files instead (`media-store.native.ts`).
export function createMediaStore(_serverId: string): MediaStore {
  const kept = new Map<string, string>();

  return {
    find: (path) => kept.get(path) ?? null,
    keep: (path, bytes, mime) => {
      const uri = `data:${mime};base64,${bytesBase64(bytes)}`;
      kept.set(path, uri);

      return Promise.resolve(uri);
    },
  };
}

// Nothing outlives the page on web, so there is nothing to wipe.
export function forgetServerMedia(_serverId: string): void {}
