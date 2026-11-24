import { expect, it, vi } from 'vitest';
import {
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
