import { ForgottenError, type MediaStore } from './media-store-core';

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

const base36 = 36;

const partial = '.part';

// Most a Server's images may take on the Device. Past it the oldest files go, down to three quarters of it, so a trim is not repeated on every write.
export const mediaCacheLimit = limitMebibytes * bytesPerMebibyte;

const trimmedTo = mediaCacheLimit * trimmedShare;

// File systems refuse names past 255 bytes, and a copy being written adds a suffix, so a longer name keeps its start and extension and hashes the rest.
export const maxNameLength = 120;

const keptStart = 80;

const hashSeed = 0x81_1c_9d_c5;

const otherSeed = 0x81_1c_9d_3a;

const hashPrime = 0x01_00_01_93;

// FNV-1a over the whole name, twice with different seeds, so two long names that start alike do not meet in one file.
function hashOf(text: string): string {
  const parts = [hashSeed, otherSeed].map((seed) => {
    let hash = seed;

    for (let index = 0; index < text.length; index += 1) {
      hash = Math.imul(hash ^ text.charCodeAt(index), hashPrime);
    }

    return (hash >>> 0).toString(base36);
  });

  return parts.join('');
}

// Every other character becomes `_` and its code, so two paths never share a file name and the name is safe in a file URL. A path's own extension stays readable at the end.
export function safeName(path: string): string {
  const name = path.replaceAll(
    /[^\w.-]|_/g,
    (char) => `_${char.codePointAt(0)?.toString(hexRadix) ?? ''}_`,
  );

  if (name.length <= maxNameLength) return name;
  const extension = /\.\w{1,8}$/.exec(name)?.[0] ?? '';

  return `${name.slice(0, keptStart)}_${hashOf(name)}${extension}`;
}

// Servers whose files were wiped, per disk: a copy still arriving for one of them is not written, which would bring its folder back.
const forgotten = new WeakMap<MediaDisk, Set<string>>();

const forgottenOn = (disk: MediaDisk): Set<string> => {
  const servers = forgotten.get(disk) ?? new Set<string>();
  forgotten.set(disk, servers);

  return servers;
};

// Servers whose folder has been looked at this run: copies cut short by an earlier run are cleared then, and never while this run may be writing one.
const swept = new WeakMap<MediaDisk, Set<string>>();

function sweepOnce(disk: MediaDisk, serverId: string): void {
  const servers = swept.get(disk) ?? new Set<string>();
  swept.set(disk, servers);

  if (servers.has(serverId)) return;
  servers.add(serverId);

  const folder = disk.folder(serverId);

  if (!folder.exists) return;

  for (const file of folder.list())
    if (file.uri.endsWith(partial)) file.delete();
  trim(folder);
}

let writes = 0;

/*
 * A phone's Blobs and Plugin assets, kept as files in the App's cache directory: one folder per Server and one file per path, so a Blob is fetched once and survives a restart.
 * The system may clear the cache directory when the Device is short of space; a file that is gone is simply fetched again.
 * Making a store touches nothing: the folder is first looked at when the first image of a run is kept, which clears copies an earlier run left cut short.
 * A Server wiped by `forgetServerFiles` keeps nothing more until `rememberServerFiles` says it is paired again.
 */
export function createFileMediaStore(
  disk: MediaDisk,
  serverId: string,
): MediaStore {
  const folder = disk.folder(serverId);

  return {
    find: (path) => {
      const file = disk.file(serverId, safeName(path));

      return file.exists ? file.uri : null;
    },
    keep: async (path, bytes) => {
      const kept = await keepFile({ disk, serverId }, path, bytes);

      if (!forgottenOn(disk).has(serverId)) trim(folder, kept);

      return kept;
    },
  };
}

const gone = (): Error => new ForgottenError();

interface Where {
  disk: MediaDisk;
  serverId: string;
}

// Written beside under a name of its own and moved in, so a copy cut short is never mistaken for the image, and two copies of one path never share a file.
async function writeAside(
  { disk, serverId }: Where,
  name: string,
  bytes: Uint8Array,
): Promise<MediaFile> {
  writes += 1;

  const writing = disk.file(
    serverId,
    `${name}.${writes.toString(base36)}${partial}`,
  );

  await writing.write(bytes);

  return writing;
}

async function keepFile(
  where: Where,
  path: string,
  bytes: Uint8Array,
): Promise<string> {
  const { disk, serverId } = where;

  if (forgottenOn(disk).has(serverId)) throw gone();
  sweepOnce(disk, serverId);
  disk.folder(serverId).create();

  const name = safeName(path);

  return moveIn(where, await writeAside(where, name, bytes), name);
}

async function moveIn(
  { disk, serverId }: Where,
  writing: MediaFile,
  name: string,
): Promise<string> {
  if (forgottenOn(disk).has(serverId)) {
    writing.delete();
    throw gone();
  }

  // Moving from a copy that is gone would clear the image already kept under this name on iOS.
  if (!writing.exists) throw new Error('The copy was lost before it was kept');
  await writing.moveOver(name);

  const kept = disk.file(serverId, name);

  if (forgottenOn(disk).has(serverId)) {
    kept.delete();
    throw gone();
  }

  return kept.uri;
}

// The Server is unpaired or removed: everything kept for it goes, and nothing still arriving is kept.
export function forgetServerFiles(disk: MediaDisk, serverId: string): void {
  forgottenOn(disk).add(serverId);
  const folder = disk.folder(serverId);

  if (folder.exists) folder.delete();
}

// The Server is paired again: what arrives for it is kept once more.
export function rememberServerFiles(disk: MediaDisk, serverId: string): void {
  forgottenOn(disk).delete(serverId);
}

// Deletes the oldest files, never `keeping`, once the folder holds more than the limit, until it is back under `trimmedTo`. One file over the limit on its own stays.
function trim(folder: MediaFolder, keeping?: string): void {
  if (!folder.exists) return;

  const files = folder
    .list()
    .map((file) => ({ file, ...file.info() }))
    .sort((a, b) => (a.modificationTime ?? 0) - (b.modificationTime ?? 0));

  let total = files.reduce((sum, { size }) => sum + (size ?? 0), 0);

  if (total <= mediaCacheLimit) return;

  for (const { file, size } of files) {
    if (total > trimmedTo && file.uri !== keeping) {
      file.delete();
      total -= size ?? 0;
    }
  }
}
