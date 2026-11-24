import { expect, it, vi } from 'vitest';
import {
  ForgottenError,
  memoryMedia,
  withFallback,
  type MediaStore,
  type MemoryUrls,
} from './media-store';

const bytes = new Uint8Array(3);

function countingUrls(): MemoryUrls & { revoked: string[] } {
  const revoked: string[] = [];
  let made = 0;

  return {
    revoked,
    make: () => {
      made += 1;

      return `blob:${made}`;
    },
    revoke: (url) => void revoked.push(url),
  };
}

const failing: MediaStore = {
  find: () => null,
  keep: () => Promise.reject(new Error('Disk full')),
};

it('holds an image in memory when the disk cannot keep it, and says so once', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  const memory = memoryMedia(countingUrls()).store('server-a');
  const store = withFallback(failing, memory);

  expect(await store.keep('/blobs/a', bytes, 'image/png')).toBe('blob:1');
  await store.keep('/blobs/b', bytes, 'image/png');

  expect(store.find('/blobs/a')).toBe('blob:1');
  expect(error).toHaveBeenCalledOnce();
  error.mockRestore();
});

it('gives back every URL held for a Server that is forgotten, and no other', async () => {
  const urls = countingUrls();
  const held = memoryMedia(urls);

  await held.store('server-a').keep('/blobs/a', bytes, 'image/png');
  await held.store('server-b').keep('/blobs/a', bytes, 'image/png');
  held.forget('server-a');

  expect(urls.revoked).toEqual(['blob:1']);
  expect(held.store('server-a').find('/blobs/a')).toBeNull();
  expect(held.store('server-b').find('/blobs/a')).toBe('blob:2');
});

it('keeps nothing in memory for a Server forgotten while an image was arriving, until it is added again', async () => {
  const urls = countingUrls();
  const held = memoryMedia(urls);
  const store = held.store('server-a');

  held.forget('server-a');

  await expect(
    store.keep('/blobs/a', bytes, 'image/png'),
  ).rejects.toBeInstanceOf(ForgottenError);
  expect(urls.revoked).toEqual([]);
  expect(store.find('/blobs/a')).toBeNull();

  held.remember('server-a');

  expect(await store.keep('/blobs/a', bytes, 'image/png')).toBe('blob:1');
});

it('does not hold in memory what a forgotten Server could not keep on the disk', async () => {
  const forgottenDisk: MediaStore = {
    find: () => null,
    keep: () => Promise.reject(new ForgottenError()),
  };

  const memory = memoryMedia(countingUrls());
  const store = withFallback(forgottenDisk, memory.store('server-a'));

  await expect(
    store.keep('/blobs/a', bytes, 'image/png'),
  ).rejects.toBeInstanceOf(ForgottenError);
  expect(memory.store('server-a').find('/blobs/a')).toBeNull();
});

it('keeps the URL of an image kept twice alive', async () => {
  const urls = countingUrls();
  const store = memoryMedia(urls).store('server-a');

  const first = await store.keep('/blobs/a', bytes, 'image/png');
  const second = await store.keep('/blobs/a', bytes, 'image/png');

  expect(second).toBe(first);
  expect(urls.revoked).toEqual([]);
  expect(store.find('/blobs/a')).toBe(first);
});

it('says so, and makes no URL, for an image larger than memory may hold', async () => {
  const urls = countingUrls();
  const store = memoryMedia(urls, 2).store('server-a');

  await expect(store.keep('/blobs/a', bytes, 'image/png')).rejects.toThrow(
    'too large',
  );
  expect(store.find('/blobs/a')).toBeNull();
  expect(urls.revoked).toEqual([]);
});

it('gives back the least recently used image once memory holds more than its size', async () => {
  const urls = countingUrls();
  const store = memoryMedia(urls, 5).store('server-a');

  await store.keep('/blobs/a', bytes, 'image/png');
  await store.keep('/blobs/b', bytes, 'image/png');

  expect(urls.revoked).toEqual(['blob:1']);
  expect(store.find('/blobs/a')).toBeNull();
  expect(store.find('/blobs/b')).toBe('blob:2');
});
