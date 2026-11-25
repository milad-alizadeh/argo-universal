import { expect, it, vi } from 'vitest';
import { ChannelMedia } from './channel-media';
import type { MediaStore } from './media-store-core';

// The Device's storage, standing in for the App's cache directory: it outlives each ChannelMedia, as files outlive a restart.
function deviceStore(): MediaStore {
  const files = new Map<string, string>();

  return {
    find: (path) => files.get(path) ?? null,
    keep: (path, _bytes, mime) => {
      files.set(path, `file:///cache${path}.${mime}`);

      return Promise.resolve(files.get(path) ?? '');
    },
  };
}

interface Pending {
  path: string;
  signal: AbortSignal | undefined;
  settle: (body: string) => void;
}

interface SlowServer {
  read: typeof fetch;
  pending: Pending[];
}

// A Server the test answers by hand: each read waits in `pending` until `settle`.
function slowServer(): SlowServer {
  const pending: Pending[] = [];

  const read: typeof fetch = (input, init) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal ?? undefined;
      signal?.addEventListener('abort', () => reject(new Error('aborted')));
      pending.push({
        path: typeof input === 'string' ? input : '',
        signal,
        settle: (body) =>
          resolve(
            new Response(body, { headers: { 'content-type': 'image/png' } }),
          ),
      });
    });

  return { read, pending };
}

it('answers an empty URL and starts nothing when it is only asked', () => {
  const server = slowServer();
  const media = new ChannelMedia(server.read);

  expect(media.urlFor('/blobs/a')).toBe('');
  expect(server.pending).toHaveLength(0);
});

it('reads a path once for its watchers and tells only them when it arrives', async () => {
  const server = slowServer();
  const media = new ChannelMedia(server.read);
  const watchingA = vi.fn<() => void>();
  const alsoA = vi.fn<() => void>();
  const watchingB = vi.fn<() => void>();

  media.watch('/blobs/a', watchingA);
  media.watch('/blobs/a', alsoA);
  media.watch('/blobs/b', watchingB);
  expect(server.pending.map(({ path }) => path)).toEqual([
    '/blobs/a',
    '/blobs/b',
  ]);

  server.pending[0]?.settle('png');
  await vi.waitFor(() => expect(watchingA).toHaveBeenCalledOnce());

  expect(alsoA).toHaveBeenCalledOnce();
  expect(watchingB).not.toHaveBeenCalled();
  expect(media.urlFor('/blobs/a')).toMatch(/^blob:/);
});

it('stops a read nobody watches any more, and reads again for the next watcher', () => {
  const server = slowServer();
  const media = new ChannelMedia(server.read);

  const stop = media.watch('/blobs/a', () => {});
  stop();

  expect(server.pending[0]?.signal?.aborted).toBe(true);

  media.watch('/blobs/a', () => {});
  expect(server.pending).toHaveLength(2);
  expect(server.pending[1]?.signal?.aborted).toBe(false);
});

it('keeps a read while any watcher is left', () => {
  const server = slowServer();
  const media = new ChannelMedia(server.read);

  const stop = media.watch('/blobs/a', () => {});
  media.watch('/blobs/a', () => {});
  stop();

  expect(server.pending[0]?.signal?.aborted).toBe(false);
});

it('reads ahead of a watcher when told to, and keeps it when no one watches', () => {
  const server = slowServer();
  const media = new ChannelMedia(server.read);

  media.preload('/blobs/a');
  media.watch('/blobs/a', () => {})();

  expect(server.pending).toHaveLength(1);
  expect(server.pending[0]?.signal?.aborted).toBe(false);
});

it('draws a Blob from the Device after a restart without asking the Server again', async () => {
  const store = deviceStore();
  const first = slowServer();
  const media = new ChannelMedia(first.read, store);
  const arrived = vi.fn<() => void>();

  media.watch('/blobs/a', arrived);
  first.pending[0]?.settle('png');
  await vi.waitFor(() => expect(arrived).toHaveBeenCalledOnce());

  const afterRestart = slowServer();
  const restarted = new ChannelMedia(afterRestart.read, store);

  expect(restarted.urlFor('/blobs/a')).toBe('file:///cache/blobs/a.image/png');
  restarted.watch('/blobs/a', () => {});
  restarted.preload('/blobs/a');

  expect(afterRestart.pending).toHaveLength(0);
});
