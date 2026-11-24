import { expect, it, vi } from 'vitest';
import { bytesText, concatBytes, textBytes } from './bytes';
import {
  maxConcurrentDownloads,
  mediaFetch,
  type MediaChannel,
} from './media-fetch';
import type { StreamListener } from './secure-stream';

const whole = (body: string, headers = ''): Uint8Array =>
  textBytes(
    `HTTP/1.1 200 OK\r\ncontent-length: ${body.length}\r\n${headers}\r\n${body}`,
  );

interface FakeChannel {
  channel: MediaChannel;
  requests: string[];
  send: (bytes: Uint8Array) => void;
  answer: (body: string) => void;
  hangUp: () => void;
}

// A channel the test plays the Server on: it records the requests written and sends what the test says.
function fakeChannel(): FakeChannel {
  const requests: string[] = [];
  let listener: StreamListener | undefined;

  return {
    channel: {
      stream: {
        write: (bytes): void => {
          requests.push(bytesText(bytes));
        },
        listen: (given): void => {
          listener = given;
        },
        close: (): void => {},
      },
    },
    requests,
    send: (bytes) => listener?.onData(bytes),
    answer: (body) => listener?.onData(whole(body)),
    hangUp: () => listener?.onClose(),
  };
}

interface MediaOver {
  read: typeof fetch;
  openCount: () => number;
}

function mediaOver(
  channels: FakeChannel[],
  fallback: typeof fetch = () => Promise.reject(new Error('no fallback')),
): MediaOver {
  let opened = 0;

  const read = mediaFetch({
    openChannel: async () => {
      const next = channels[opened];
      opened += 1;

      if (!next) throw new Error('no channel left');

      return next.channel;
    },
    randomBytes: () => new Uint8Array(16),
    fallback,
  });

  return { read, openCount: () => opened };
}

const paths = (requests: string[]): (string | undefined)[] =>
  requests.map((request) => request.split(' ')[1]);

it('opens one channel for several images and answers each with its own bytes', async () => {
  const server = fakeChannel();
  const { read, openCount } = mediaOver([server]);

  const first = read('/blobs/a');
  const second = read('/blobs/b');

  await vi.waitFor(() => expect(server.requests).toHaveLength(2));
  server.answer('image a');
  server.answer('image b');

  expect(await (await first).text()).toBe('image a');
  expect(await (await second).text()).toBe('image b');
  expect(openCount()).toBe(1);
  expect(server.requests[0]).toContain('HTTP/1.1');
});

it('reads the next image on the channel it already has', async () => {
  const server = fakeChannel();
  const { read, openCount } = mediaOver([server]);

  const first = read('/blobs/a');
  await vi.waitFor(() => expect(server.requests).toHaveLength(1));
  server.answer('image a');
  await first;

  const second = read('/blobs/b');
  await vi.waitFor(() => expect(server.requests).toHaveLength(2));
  server.answer('image b');

  expect(await (await second).text()).toBe('image b');
  expect(openCount()).toBe(1);
});

it('has at most four downloads on the way and starts the next as one finishes', async () => {
  const server = fakeChannel();
  const { read } = mediaOver([server]);

  const all = Array.from({ length: 6 }, (_, index) => read(`/blobs/${index}`));

  await vi.waitFor(() =>
    expect(server.requests).toHaveLength(maxConcurrentDownloads),
  );
  expect(paths(server.requests)).toEqual([
    '/blobs/0',
    '/blobs/1',
    '/blobs/2',
    '/blobs/3',
  ]);

  server.answer('0');
  await vi.waitFor(() => expect(server.requests).toHaveLength(5));
  server.answer('1');
  await vi.waitFor(() => expect(server.requests).toHaveLength(6));

  for (const body of ['2', '3', '4', '5']) server.answer(body);

  expect(
    await Promise.all(all.map(async (item) => (await item).text())),
  ).toEqual(['0', '1', '2', '3', '4', '5']);
});

it('reads a response that arrives in pieces and two that arrive together', async () => {
  const server = fakeChannel();
  const { read } = mediaOver([server]);

  const first = read('/blobs/a');
  const second = read('/blobs/b');
  await vi.waitFor(() => expect(server.requests).toHaveLength(2));

  const bytes = concatBytes(whole('image a'), whole('image b'));
  const cut = 20;

  server.send(bytes.subarray(0, cut));
  server.send(bytes.subarray(cut, -3));
  server.send(bytes.subarray(-3));

  expect(await (await first).text()).toBe('image a');
  expect(await (await second).text()).toBe('image b');
});

it('opens a new channel when the Server closed the idle one', async () => {
  const idle = fakeChannel();
  const fresh = fakeChannel();
  const { read, openCount } = mediaOver([idle, fresh]);

  const first = read('/blobs/a');
  await vi.waitFor(() => expect(idle.requests).toHaveLength(1));
  idle.answer('image a');
  await first;

  idle.hangUp();
  const second = read('/blobs/b');

  await vi.waitFor(() => expect(fresh.requests).toHaveLength(1));
  fresh.answer('image b');

  expect(await (await second).text()).toBe('image b');
  expect(openCount()).toBe(2);
});

it('sends a read again on a new channel when the Server closes before answering it', async () => {
  const dying = fakeChannel();
  const fresh = fakeChannel();
  const { read } = mediaOver([dying, fresh]);

  const pending = read('/blobs/a');
  await vi.waitFor(() => expect(dying.requests).toHaveLength(1));
  dying.hangUp();

  await vi.waitFor(() => expect(fresh.requests).toHaveLength(1));
  fresh.answer('image a');

  expect(await (await pending).text()).toBe('image a');
});

it('leaves a response with no length to a channel of its own', async () => {
  const server = fakeChannel();
  const fallback = vi.fn<typeof fetch>(async () => new Response('streamed'));
  const { read } = mediaOver([server], fallback);

  const pending = read('/plugin-assets/p/h.mp4');
  await vi.waitFor(() => expect(server.requests).toHaveLength(1));

  server.send(
    textBytes('HTTP/1.1 200 OK\r\ncontent-type: video/mp4\r\n\r\nabc'),
  );

  expect(await (await pending).text()).toBe('streamed');
  expect(fallback).toHaveBeenCalledOnce();
});

it('treats a Content-Length that is not a number as no length', async () => {
  const server = fakeChannel();
  const fallback = vi.fn<typeof fetch>(async () => new Response('streamed'));
  const { read } = mediaOver([server], fallback);

  const pending = read('/blobs/a');
  await vi.waitFor(() => expect(server.requests).toHaveLength(1));

  server.send(textBytes('HTTP/1.1 200 OK\r\ncontent-length: abc\r\n\r\nxyz'));

  expect(await (await pending).text()).toBe('streamed');
});

it('drops a read that is aborted while it waits, so it never holds the queue', async () => {
  const server = fakeChannel();
  const { read } = mediaOver([server]);
  const gone = new AbortController();

  const first = Array.from({ length: maxConcurrentDownloads }, (_, index) =>
    read(`/blobs/${index}`),
  );

  const dropped = read('/blobs/gone', { signal: gone.signal });
  const kept = read('/blobs/kept');

  await vi.waitFor(() =>
    expect(server.requests).toHaveLength(maxConcurrentDownloads),
  );
  gone.abort();
  await expect(dropped).rejects.toMatchObject({ name: 'AbortError' });

  for (let index = 0; index < maxConcurrentDownloads; index += 1)
    server.answer(String(index));
  await Promise.all(first);

  await vi.waitFor(() => expect(server.requests).toHaveLength(5));
  expect(paths(server.requests).at(-1)).toBe('/blobs/kept');
  server.answer('kept');
  expect(await (await kept).text()).toBe('kept');
});

it('reads an aborted response to its end, so the next read on the channel gets its own bytes', async () => {
  const server = fakeChannel();
  const { read, openCount } = mediaOver([server]);
  const gone = new AbortController();

  const aborted = read('/blobs/gone', { signal: gone.signal });
  const next = read('/blobs/next');
  await vi.waitFor(() => expect(server.requests).toHaveLength(2));

  const bytes = concatBytes(whole('first image'), whole('second image'));
  const partway = 40;

  server.send(bytes.subarray(0, partway));
  gone.abort();
  await expect(aborted).rejects.toMatchObject({ name: 'AbortError' });

  server.send(bytes.subarray(partway));

  expect(await (await next).text()).toBe('second image');
  expect(openCount()).toBe(1);
});

it('rejects a read that was aborted before it began', async () => {
  const { read, openCount } = mediaOver([fakeChannel()]);
  const gone = new AbortController();
  gone.abort();

  await expect(read('/blobs/a', { signal: gone.signal })).rejects.toMatchObject(
    { name: 'AbortError' },
  );
  expect(openCount()).toBe(0);
});

it('sends reads again in the order they were first sent', async () => {
  const dying = fakeChannel();
  const fresh = fakeChannel();
  const { read } = mediaOver([dying, fresh]);

  const all = ['a', 'b', 'c'].map((name) => read(`/blobs/${name}`));
  await vi.waitFor(() => expect(dying.requests).toHaveLength(3));
  dying.hangUp();

  await vi.waitFor(() => expect(fresh.requests).toHaveLength(3));
  expect(paths(fresh.requests)).toEqual(['/blobs/a', '/blobs/b', '/blobs/c']);

  for (const body of ['a', 'b', 'c']) fresh.answer(body);
  await Promise.all(all);
});

it('sends a call that is not a read on a channel of its own', async () => {
  const fallback = vi.fn<typeof fetch>(async () => new Response('stored'));
  const { read, openCount } = mediaOver([], fallback);

  const response = await read('/trpc/blob.upload', {
    method: 'POST',
    body: 'png',
  });

  expect(await response.text()).toBe('stored');
  expect(openCount()).toBe(0);
});
