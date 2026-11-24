import { expect, it } from 'vitest';
import {
  createFileMediaStore,
  forgetServerFiles,
  maxNameLength,
  rememberServerFiles,
  mediaCacheLimit,
  type MediaDisk,
  type MediaFile,
} from './file-media-store';
import { ForgottenError } from './media-store';

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

      const destination = `${url.slice(0, url.lastIndexOf('/') + 1)}${name}`;

      if (!moved) {
        // As iOS does: the destination is cleared before the missing source is found out.
        stored.delete(destination);

        return Promise.reject(new Error('No such file'));
      }

      stored.set(destination, moved);
      stored.delete(url);

      return Promise.resolve();
    },
    delete: () => void stored.delete(url),
  });

  return {
    folder: (serverId) => {
      const prefix = `file:///cache/${serverId}/`;

      const folderExists = (): boolean =>
        stored.keys().some((url) => url.startsWith(prefix));

      return {
        get exists() {
          return folderExists();
        },
        create: () => {},
        list: () => {
          if (!folderExists()) throw new Error('No such folder');

          return stored
            .keys()
            .filter((url) => url.startsWith(prefix))
            .map((url) => fileAt(url))
            .toArray();
        },
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

  await expect(
    store.keep('/blobs/a', bytes(10), 'image/png'),
  ).rejects.toBeInstanceOf(ForgottenError);
  expect(disk.folder('server-a').exists).toBe(false);

  rememberServerFiles(disk, 'server-a');

  expect(await store.keep('/blobs/a', bytes(10), 'image/png')).toMatch(
    /^file:/,
  );
});

it('does not lift the wipe when another store is made for the Server', async () => {
  const disk = memoryDisk();

  forgetServerFiles(disk, 'server-a');
  const rebuilt = createFileMediaStore(disk, 'server-a');

  await expect(
    rebuilt.keep('/blobs/a', bytes(10), 'image/png'),
  ).rejects.toBeInstanceOf(ForgottenError);
});

// A disk whose part files wait on `release` before they are written, so a test can act while a copy is mid-write.
interface PausedDisk {
  disk: MediaDisk;
  release: () => void;
  moves: string[];
}

function pausedWrites(disk: MediaDisk): PausedDisk {
  const moves: string[] = [];
  const { promise: gate, resolve: release } = Promise.withResolvers<void>();

  return {
    moves,
    release: () => release(),
    disk: {
      folder: (serverId) => disk.folder(serverId),
      file: (serverId, name) => {
        const file = disk.file(serverId, name);

        return name.endsWith('.part')
          ? Object.assign(Object.create(file), {
              write: async (data: Uint8Array) => {
                await gate;
                await file.write(data);
              },
              moveOver: (to: string) => {
                moves.push(to);

                return file.moveOver(to);
              },
            })
          : file;
      },
    },
  };
}

it('does not bring a wiped Server back when its copy finishes writing after the wipe', async () => {
  const real = memoryDisk();
  const paused = pausedWrites(real);
  const store = createFileMediaStore(paused.disk, 'server-a');

  const keeping = store.keep('/blobs/a', bytes(10), 'image/png');

  forgetServerFiles(paused.disk, 'server-a');
  paused.release();

  await expect(keeping).rejects.toBeInstanceOf(ForgottenError);
  expect(real.folder('server-a').exists).toBe(false);
  // Nothing was moved into the wiped folder, even to be deleted again.
  expect(paused.moves).toEqual([]);
});

it('leaves a store being used alone when another is made for the same Server', async () => {
  const real = memoryDisk();
  const paused = pausedWrites(real);

  const keeping = createFileMediaStore(paused.disk, 'server-a').keep(
    '/blobs/a',
    bytes(10),
    'image/png',
  );

  const other = createFileMediaStore(paused.disk, 'server-a');

  const alongside = other.keep('/blobs/b', bytes(10), 'image/png');

  paused.release();
  await alongside;

  expect(await keeping).toMatch(/^file:/);
});

it('clears copies cut short by an earlier run once, when the first image is kept', async () => {
  const disk = memoryDisk();

  await disk.file('server-a', 'x.1.part').write(bytes(5));
  const store = createFileMediaStore(disk, 'server-a');

  expect(disk.folder('server-a').list()).toHaveLength(1);
  await store.keep('/blobs/a', bytes(10), 'image/png');

  expect(disk.folder('server-a').list()).toHaveLength(1);
});

it('keeps the image already cached when a new copy of it vanishes before it is moved in', async () => {
  const real = memoryDisk();
  const store = createFileMediaStore(real, 'server-a');
  const url = await store.keep('/blobs/a', bytes(10), 'image/png');

  const vanishing = createFileMediaStore(
    {
      folder: (serverId) => real.folder(serverId),
      file: (serverId, name) =>
        Object.assign(Object.create(real.file(serverId, name)), {
          write: () => Promise.resolve(),
        }),
    },
    'server-a',
  );

  await vanishing.keep('/blobs/a', bytes(10), 'image/png').catch(() => {});

  expect(store.find('/blobs/a')).toBe(url);
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
