import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { blobPath } from '@repo/contracts';
import { expect, it } from 'vitest';
import { answerOver } from '#mocks/channel-fetch';
import { startEngineTestHost } from '#mocks/engine';
import { openChannel } from '#mocks/engine-channel';

type Host = Awaited<ReturnType<typeof startEngineTestHost>>;

const idOf = (bytes: Buffer): string =>
  createHash('sha256').update(bytes).digest('hex');

// What a Feed page is made of: rows of JSON that repeat their own keys and words.
const feedPage = Buffer.from(
  JSON.stringify(
    Array.from({ length: 4000 }, (_, id) => ({
      id: `row-${id}`,
      kind: 'agent_message',
      revision: id,
      text: 'The quick brown fox jumps over the lazy dog and keeps running',
    })),
  ),
);

async function hostWith(bytes: Buffer): Promise<Host> {
  const host = await startEngineTestHost();

  await mkdir(join(host.home, 'blobs'), { recursive: true });
  await writeFile(join(host.home, 'blobs', idOf(bytes)), bytes);

  return host;
}

// What crosses the socket for one read of the Blob, and what the App got back.
async function readBlob(
  host: Host,
  bytes: Buffer,
  compression: boolean,
): Promise<{ wire: number; body: Buffer }> {
  const { ticket } = host.pairing.mint();
  const { socket } = await openChannel(host, { ticket, compression });
  const before = socket.wireBytesRead;

  const response = await answerOver(
    `${host.url}${blobPath(idOf(bytes))}`,
    {},
    { createConnection: () => socket },
  );

  const body = Buffer.from(await response.arrayBuffer());
  const wire = socket.wireBytesRead - before;

  socket.destroy();

  return { wire, body };
}

it('sends a large Feed page at a fraction of its size to an App that offered compression', async (): Promise<void> => {
  const host = await hostWith(feedPage);

  const { wire, body } = await readBlob(host, feedPage, true);

  expect(body).toEqual(feedPage);
  expect(feedPage.length).toBeGreaterThan(400_000);
  expect(wire).toBeLessThan(feedPage.length / 10);
});

it('still pairs and reads, at full size, for an App that did not offer compression', async (): Promise<void> => {
  const host = await hostWith(feedPage);

  const { wire, body } = await readBlob(host, feedPage, false);

  expect(body).toEqual(feedPage);
  expect(wire).toBeGreaterThan(feedPage.length);
});

it('sends bytes that are already compressed at their own size', async (): Promise<void> => {
  const image = randomBytes(200_000);
  const host = await hostWith(image);

  const { wire, body } = await readBlob(host, image, true);

  expect(body).toEqual(image);
  expect(wire).toBeLessThan(image.length * 1.02);
});
