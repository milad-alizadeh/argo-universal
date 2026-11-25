import { LRUCache } from 'lru-cache';
import { bytesBase64 } from './bytes';

/*
 * Where the bytes of a Server's Blobs and Plugin assets are kept once they have come over the channel. A Blob never changes, so a kept copy is never stale.
 * `find` answers at once with a URL an image can draw from, or null when nothing is kept; `keep` stores the bytes and answers with that URL.
 */
export interface MediaStore {
  find: (path: string) => string | null;
  keep: (path: string, bytes: Uint8Array, mime: string) => Promise<string>;
}

// A copy arriving for a Server that has been removed: not kept anywhere, so nothing of it outlives the Server.
export class ForgottenError extends Error {
  public constructor() {
    super('The Server was removed, so its images are not kept');
  }
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
interface Held {
  url: string;
  size: number;
}

export interface MemoryMedia {
  store: (serverId: string) => MediaStore;
  forget: (serverId: string) => void;
  remember: (serverId: string) => void;
}

export function memoryMedia(
  urls: MemoryUrls,
  maxBytes = Number.MAX_SAFE_INTEGER,
): MemoryMedia {
  const held = new Map<string, LRUCache<string, Held>>();
  const forgotten = new Set<string>();

  const heldBy = (serverId: string): LRUCache<string, Held> => {
    const mine =
      held.get(serverId) ??
      new LRUCache<string, Held>({
        maxSize: maxBytes,
        sizeCalculation: ({ size }: Held): number => Math.max(size, 1),
        dispose: ({ url }: Held): void => urls.revoke?.(url),
      });

    held.set(serverId, mine);

    return mine;
  };

  return {
    store: (serverId) => ({
      find: (path) => held.get(serverId)?.get(path)?.url ?? null,
      keep: (path, bytes, mime) => {
        if (forgotten.has(serverId))
          return Promise.reject(new ForgottenError());
        const mine = heldBy(serverId);
        const already = mine.get(path);

        // Kept again: the URL an image may be drawing from stays, and is not given back.
        if (already) return Promise.resolve(already.url);

        // The cache would drop it at once and its URL would never be given back.
        if (bytes.length > maxBytes)
          return Promise.reject(
            new Error(`${path} is too large to hold in memory`),
          );
        const url = urls.make(bytes, mime);

        mine.set(path, { url, size: bytes.length });

        return Promise.resolve(url);
      },
    }),
    forget: (serverId) => {
      forgotten.add(serverId);
      held.get(serverId)?.clear();
      held.delete(serverId);
    },
    remember: (serverId) => void forgotten.delete(serverId),
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
        // A Server that was removed has nothing kept anywhere, memory included.
        if (cause instanceof ForgottenError) throw cause;

        if (!logged)
          console.error('Could not keep an image on the Device', cause);
        logged = true;

        return fallback.keep(path, bytes, mime);
      }
    },
  };
}
