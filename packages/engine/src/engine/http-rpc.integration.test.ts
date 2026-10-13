import { existsSync, readdirSync } from 'node:fs';
import { maxBlobUploadBytes } from '@repo/contracts';
import { beforeEach, expect, it } from 'vitest';
import { startEngineTestHost } from '#mocks/engine';
import {
  sendHttpRequest as sendRequest,
  sendFormRequest as sendForm,
} from '#mocks/http-client';

const binaryMime = 'application/octet-stream';
const infoRoute = '/trpc/system.info';
const systemInfo = {
  version: '1.2.3',
  startedAt: '2026-10-03T00:00:00.000Z',
  pid: process.pid,
  name: expect.stringMatching(/\S/),
};
let host: Awaited<ReturnType<typeof startEngineTestHost>>;
beforeEach(async (): Promise<void> => {
  host = await startEngineTestHost();
});
const sendHttpRequest = (
  options: Parameters<typeof sendRequest>[1],
): ReturnType<typeof sendRequest> => sendRequest(host.url, options);

it('answers a tRPC query over HTTP at /trpc/', async (): Promise<void> => {
  const response = await sendHttpRequest({ path: infoRoute });
  expect(response.status).toBe(200);
  expect(JSON.parse(response.body)).toEqual({ result: { data: systemInfo } });
});

it('stores an unread multipart upload and serves its bytes', async (): Promise<void> => {
  const response = await sendForm(host.url);
  expect(response.status).toBe(200);
  expect(JSON.parse(response.body)).toEqual({
    result: {
      data: {
        blobId:
          'e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c',
        mime: binaryMime,
        bytes: 12,
      },
    },
  });
  const stored = await fetch(
    `${host.url}/blobs/e0ac3601005dfa1864f5392aabaf7d898b1b5bab854f1acb4491bcd806b76b0c`,
  );
  expect(await stored.text()).toBe('file content');
});

it.each(['/health', '/'])(
  'sends %s to tRPC, which finds no procedure',
  async (path): Promise<void> => {
    const response = await sendHttpRequest({ path });
    expect(response.status).toBe(404);
    expect(JSON.parse(response.body)).toMatchObject({
      error: { data: { code: 'NOT_FOUND' } },
    });
  },
);

it('answers feed.page from the database', async (): Promise<void> => {
  const input = encodeURIComponent(
    JSON.stringify({ sessionId: 'session-1', direction: 'tail' }),
  );
  const response = await fetch(`${host.url}/trpc/feed.page?input=${input}`);
  expect(await response.json()).toMatchObject({
    result: { data: { epoch: 0, rows: [], startCursor: null } },
  });
});

it('refuses an upload over 20 MB before reading all of it', async (): Promise<void> => {
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(maxBlobUploadBytes + 1)]));
  const response = await fetch(`${host.url}/trpc/blob.upload`, {
    method: 'POST',
    body: form,
  });

  expect(response.status).toBe(413);
  expect(
    existsSync(host.blobsFolder) ? readdirSync(host.blobsFolder) : [],
  ).toEqual([]);
});
