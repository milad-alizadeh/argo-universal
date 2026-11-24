import { Directory, File, Paths } from 'expo-file-system';
import {
  createFileMediaStore,
  forgetServerFiles,
  safeName,
  type MediaDisk,
  type MediaFile,
} from './file-media-store';
import {
  dataUrls,
  memoryMedia,
  type MediaStore,
  withFallback,
} from './media-store';

const cacheFolderName = 'argo-media';

const folderOf = (serverId: string): Directory =>
  new Directory(Paths.cache, cacheFolderName, safeName(serverId));

function mediaFile(file: File): MediaFile {
  return {
    uri: file.uri,
    get exists() {
      return file.exists;
    },
    info: () => file.info(),
    write: (bytes) => file.write(bytes),
    moveOver: (name) =>
      file.move(new File(file.parentDirectory, name), { overwrite: true }),
    delete: () => file.delete(),
  };
}

const appCache: MediaDisk = {
  folder: (serverId) => {
    const folder = folderOf(serverId);

    return {
      get exists() {
        return folder.exists;
      },
      create: () => folder.create({ intermediates: true, idempotent: true }),
      list: () =>
        folder
          .list()
          .filter((entry) => entry instanceof File)
          .map((file) => mediaFile(file)),
      delete: () => folder.delete(),
    };
  },
  file: (serverId, name) => mediaFile(new File(folderOf(serverId), name)),
};

// What the disk could not take is held in memory instead, as data URIs, until the Server is removed.
const inMemory = memoryMedia(dataUrls);

// Files in the App's cache directory on iOS and Android.
export function createMediaStore(serverId: string): MediaStore {
  return withFallback(
    createFileMediaStore(appCache, serverId),
    inMemory.store(serverId),
  );
}

export function forgetServerMedia(serverId: string): void {
  forgetServerFiles(appCache, serverId);
  inMemory.forget(serverId);
}
