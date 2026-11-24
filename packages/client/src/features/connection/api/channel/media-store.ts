import { bytesBase64 } from './bytes';

/*
 * Where the bytes of a Server's Blobs and Plugin assets are kept once they have come over the channel. A Blob never changes, so a kept copy is never stale.
 * `find` answers at once with a URL an image can draw from, or null when nothing is kept; `keep` stores the bytes and answers with that URL.
 */
export interface MediaStore {
  find: (path: string) => string | null;
  keep: (path: string, bytes: Uint8Array, mime: string) => Promise<string>;
}

// How bytes held in memory become a URL an image can draw from, and how that URL is given back.
export interface MemoryUrls {
  make: (bytes: Uint8Array, mime: string) => string;
  revoke?: (url: string) => void;
}

export const dataUrls: MemoryUrls = {
  make: (bytes, mime) => `data:${mime};base64,${bytesBase64(bytes)}`,
};

// The browser holds the bytes behind an object URL until it is revoked, so nothing is copied into a string.
export const objectUrls: MemoryUrls = {
  make: (bytes, mime) =>
    URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: mime })),
  revoke: (url) => URL.revokeObjectURL(url),
};

// What each Server's store holds in memory, so removing the Server can give every URL back.
export interface MemoryMedia {
  store: (serverId: string) => MediaStore;
  forget: (serverId: string) => void;
}

export function memoryMedia(urls: MemoryUrls): MemoryMedia {
  const held = new Map<string, Map<string, string>>();

  const heldBy = (serverId: string): Map<string, string> => {
    const mine = held.get(serverId) ?? new Map<string, string>();
    held.set(serverId, mine);

    return mine;
  };

  return {
    store: (serverId) => ({
      find: (path) => held.get(serverId)?.get(path) ?? null,
      keep: (path, bytes, mime) => {
        const mine = heldBy(serverId);
        const url = mine.get(path) ?? urls.make(bytes, mime);
        mine.set(path, url);

        return Promise.resolve(url);
      },
    }),
    forget: (serverId) => {
      for (const url of held.get(serverId)?.values() ?? []) urls.revoke?.(url);
      held.delete(serverId);
    },
  };
}

// Tries `primary`; when it cannot keep something (the disk is full, say) that one is held by `fallback` instead, and the first time is logged.
export function withFallback(
  primary: MediaStore,
  fallback: MediaStore,
): MediaStore {
  let logged = false;

  return {
    find: (path) => primary.find(path) ?? fallback.find(path),
    keep: async (path, bytes, mime) => {
      try {
        return await primary.keep(path, bytes, mime);
      } catch (cause) {
        if (!logged)
          console.error('Could not keep an image on the Device', cause);
        logged = true;

        return fallback.keep(path, bytes, mime);
      }
    },
  };
}

// Web has no file system to write to, so what arrives is held in memory until the page closes. Native Apps keep files instead (`media-store.native.ts`).
const web = memoryMedia(objectUrls);

export const createMediaStore = web.store;

export const forgetServerMedia = web.forget;
