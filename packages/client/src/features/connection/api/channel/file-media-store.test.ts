import { expect, it } from 'vitest';
import {
  createFileMediaStore,
  forgetServerFiles,
  mediaCacheLimit,
  type MediaDisk,
  type MediaFile,
} from './file-media-store';

interface Stored {
  size: number;
  modificationTime: number;
}

const urlOf = (serverId: string, name: string): string =>
  `file:///cache/${serverId}/${name}`;

// A cache directory in memory: file URL to size and the order it was written in. It outlives each store, as files outlive a restart.
function memoryDisk(): MediaDisk {
  const stored = new Map<string, Stored>();
  let clock = 0;

  const fileAt = (url: string): MediaFile => ({
    uri: url,
    get exists() {
      return stored.has(url);
    },
    info: () => stored.get(url) ?? { size: 0, modificationTime: 0 },
    write: (bytes) => {
      clock += 1;
      stored.set(url, { size: bytes.length, modificationTime: clock });

      return Promise.resolve();
    },
    moveOver: (name) => {
      const moved = stored.get(url);
      const destination = `${url.slice(0, url.lastIndexOf('/') + 1)}${name}`;

      if (moved) stored.set(destination, moved);
      stored.delete(url);

      return Promise.resolve();
    },
    delete: () => void stored.delete(url),
  });

  return {
    folder: (serverId) => {
      const prefix = `file:///cache/${serverId}/`;

      return {
        exists: stored.keys().some((url) => url.startsWith(prefix)),
        create: () => {},
        list: () =>
          stored
            .keys()
            .filter((url) => url.startsWith(prefix))
            .map((url) => fileAt(url))
            .toArray(),
        delete: () => {
          for (const url of stored.keys().toArray())
            if (url.startsWith(prefix)) stored.delete(url);
        },
      };
    },
    file: (serverId, name) => fileAt(urlOf(serverId, name)),
  };
}

const bytes = (length: number): Uint8Array => new Uint8Array(length);

it('finds nothing before a path is kept, then a URL that outlives the store', async () => {
  const disk = memoryDisk();
  const store = createFileMediaStore(disk, 'server-a');

  expect(store.find('/blobs/a')).toBeNull();
  const url = await store.keep('/blobs/a', bytes(10), 'image/png');

  expect(store.find('/blobs/a')).toBe(url);
  expect(createFileMediaStore(disk, 'server-a').find('/blobs/a')).toBe(url);
});

it('keeps each Server apart and wipes only the one that was removed', async () => {
  const disk = memoryDisk();

  await createFileMediaStore(disk, 'server-a').keep(
    '/blobs/a',
    bytes(10),
    'image/png',
  );
  await createFileMediaStore(disk, 'server-b').keep(
    '/blobs/a',
    bytes(10),
    'image/png',
  );

  forgetServerFiles(disk, 'server-a');

  expect(createFileMediaStore(disk, 'server-a').find('/blobs/a')).toBeNull();
  expect(
    createFileMediaStore(disk, 'server-b').find('/blobs/a'),
  ).not.toBeNull();
});

it('drops the oldest files once a Server holds more than the limit', async () => {
  const store = createFileMediaStore(memoryDisk(), 'server-a');
  const third = Math.ceil(mediaCacheLimit / 3);

  for (const id of ['a', 'b', 'c', 'd'])
    await store.keep(`/blobs/${id}`, bytes(third), 'image/png');

  expect(store.find('/blobs/a')).toBeNull();
  expect(store.find('/blobs/d')).not.toBeNull();
});

it('never mistakes a half-written copy for the image', async () => {
  const disk = memoryDisk();
  const store = createFileMediaStore(disk, 'server-a');

  await disk.file('server-a', '_2f_blobs_2f_a.part').write(bytes(5));

  expect(store.find('/blobs/a')).toBeNull();
});
