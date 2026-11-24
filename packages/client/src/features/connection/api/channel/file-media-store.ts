import type { MediaStore } from './media-store';

export interface MediaFile {
  uri: string;
  exists: boolean;
  info: () => { size?: number; modificationTime?: number };
  write: (bytes: Uint8Array) => Promise<void>;
  // Replaces `name` in the same folder with this file.
  moveOver: (name: string) => Promise<void>;
  delete: () => void;
}

export interface MediaFolder {
  exists: boolean;
  create: () => void;
  list: () => MediaFile[];
  delete: () => void;
}

// The App's cache directory, as far as the store needs it: a folder per Server and a file by name inside it.
export interface MediaDisk {
  folder: (serverId: string) => MediaFolder;
  file: (serverId: string, name: string) => MediaFile;
}

const bytesPerMebibyte = 1_048_576;

const limitMebibytes = 128;

const trimmedShare = 0.75;

const hexRadix = 16;

const partial = '.part';

// Most a Server's images may take on the Device. Past it the oldest files go, down to three quarters of it, so a trim is not repeated on every write.
export const mediaCacheLimit = limitMebibytes * bytesPerMebibyte;

const trimmedTo = mediaCacheLimit * trimmedShare;

// Every other character becomes `_` and its code, so two paths never share a file name and the name is safe in a file URL. A path's own extension stays readable at the end.
export function safeName(path: string): string {
  return path.replaceAll(
    /[^\w.-]|_/g,
    (char) => `_${char.codePointAt(0)?.toString(hexRadix) ?? ''}_`,
  );
}

/*
 * A phone's Blobs and Plugin assets, kept as files in the App's cache directory: one folder per Server and one file per path, so a Blob is fetched once and survives a restart.
 * The system may clear the cache directory when the Device is short of space; a file that is gone is simply fetched again.
 */
export function createFileMediaStore(
  disk: MediaDisk,
  serverId: string,
): MediaStore {
  const folder = disk.folder(serverId);
  let used: number | null = null;

  return {
    find: (path) => {
      const file = disk.file(serverId, safeName(path));

      return file.exists ? file.uri : null;
    },
    keep: async (path, bytes) => {
      folder.create();
      const name = safeName(path);
      // Written beside and moved in, so a copy cut short by the App closing is never mistaken for the image.
      const writing = disk.file(serverId, `${name}${partial}`);

      await writing.write(bytes);
      await writing.moveOver(name);
      used = (used ?? sizeOf(folder)) + bytes.length;

      if (used > mediaCacheLimit) used = trim(folder);

      return disk.file(serverId, name).uri;
    },
  };
}

// The Server is unpaired or removed: everything kept for it goes.
export function forgetServerFiles(disk: MediaDisk, serverId: string): void {
  const folder = disk.folder(serverId);

  if (folder.exists) folder.delete();
}

function sizeOf(folder: MediaFolder): number {
  return folder
    .list()
    .reduce((total, file) => total + (file.info().size ?? 0), 0);
}

// Deletes the oldest files until the folder is back under `trimmedTo`, and says what is left.
function trim(folder: MediaFolder): number {
  const files = folder
    .list()
    .map((file) => ({ file, ...file.info() }))
    .sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0));

  let total = files.reduce((sum, { size }) => sum + (size ?? 0), 0);

  for (const { file, size } of files) {
    if (total > trimmedTo) {
      file.delete();
      total -= size ?? 0;
    }
  }

  return total;
}
