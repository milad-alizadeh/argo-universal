import { expect, it } from 'vitest';
import {
  createFileMediaStore,
  forgetServerFiles,
  maxNameLength,
  mediaCacheLimit,
  type MediaDisk,
  type MediaFile,
} from './file-media-store';

interface Stored {
  size: number;
  modificationTime: number;
}

const fileNameMax = 255;

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

      if (!moved) return Promise.reject(new Error('No such file'));
      const destination = `${url.slice(0, url.lastIndexOf('/') + 1)}${name}`;

      stored.set(destination, moved);
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
    file: (serverId, name) => {
      if (name.length > fileNameMax) throw new Error('File name too long');

      return fileAt(urlOf(serverId, name));
    },
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

it('writes nothing for a Server that was wiped while a copy was arriving, until it is paired again', async () => {
  const disk = memoryDisk();
  const store = createFileMediaStore(disk, 'server-a');

  forgetServerFiles(disk, 'server-a');

  await expect(store.keep('/blobs/a', bytes(10), 'image/png')).rejects.toThrow(
    'removed',
  );
  expect(disk.folder('server-a').exists).toBe(false);

  const again = createFileMediaStore(disk, 'server-a');

  expect(await again.keep('/blobs/a', bytes(10), 'image/png')).toMatch(
    /^file:/,
  );
});

it('keeps two copies of one path arriving together', async () => {
  const store = createFileMediaStore(memoryDisk(), 'server-a');

  const urls = await Promise.all([
    store.keep('/blobs/a', bytes(10), 'image/png'),
    store.keep('/blobs/a', bytes(10), 'image/png'),
  ]);

  expect(urls[0]).toBe(urls[1]);
  expect(store.find('/blobs/a')).toBe(urls[0]);
});

it('clears a copy cut short by the App closing when the store opens', async () => {
  const disk = memoryDisk();

  await disk.file('server-a', 'x.1.part').write(bytes(5));
  createFileMediaStore(disk, 'server-a');

  expect(disk.folder('server-a').list()).toHaveLength(0);
});

it('keeps a single image over the limit and drops the others first', async () => {
  const store = createFileMediaStore(memoryDisk(), 'server-a');

  await store.keep('/blobs/a', bytes(10), 'image/png');

  const big = await store.keep(
    '/blobs/big',
    bytes(mediaCacheLimit + 1),
    'image/png',
  );

  expect(store.find('/blobs/a')).toBeNull();
  expect(store.find('/blobs/big')).toBe(big);
});

it('names a long path within the limit, apart from another long path that starts alike', async () => {
  const store = createFileMediaStore(memoryDisk(), 'server-a');
  const long = `/plugin-assets/${'p'.repeat(300)}`;

  const first = await store.keep(`${long}a.png`, bytes(1), 'image/png');
  const second = await store.keep(`${long}b.png`, bytes(1), 'image/png');

  expect(first).not.toBe(second);
  expect(first.split('/').at(-1)?.length).toBeLessThanOrEqual(maxNameLength);
  expect(first.endsWith('.png')).toBe(true);
});
