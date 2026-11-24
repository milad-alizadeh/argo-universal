import { blobPath } from '@repo/contracts';
import { startEngineTestHost } from '@repo/engine/mocks';
import { afterEach, expect, it } from 'vitest';
import { phoneOn, type Phone } from '../../../../../mocks/slow-channel-client';
import { badWifi } from '../../../../../mocks/slow-network';

const phones: Phone[] = [];

afterEach(async () => {
  for (const phone of phones.splice(0)) await phone.close();
});

const imageCount = 12;

const bodyOf = (index: number): string => `image ${index} `.repeat(2000);

async function feedWithImages(
  network?: typeof badWifi,
): Promise<{ phone: Phone; paths: string[] }> {
  const host = await startEngineTestHost();
  const phone = await phoneOn(host, network);

  phones.push(phone);

  const paths = await Promise.all(
    Array.from({ length: imageCount }, async (_, index) => {
      const form = new FormData();

      form.set(
        'file',
        new Blob([bodyOf(index)], { type: 'image/png' }),
        `image-${index}.png`,
      );
      const stored = await phone.client.blob.upload.mutate(form);

      return blobPath(stored.blobId);
    }),
  );

  return { phone, paths };
}

async function readAll(read: typeof fetch, paths: string[]): Promise<string[]> {
  return Promise.all(paths.map(async (path) => (await read(path)).text()));
}

it('reads every image of a Feed on one channel, with one handshake', async () => {
  const { phone, paths } = await feedWithImages();
  const before = phone.handshakes();

  const bodies = await readAll(phone.media, paths);

  expect(bodies).toEqual(
    Array.from({ length: imageCount }, (_, i) => bodyOf(i)),
  );
  expect(phone.handshakes() - before).toBe(1);
});

it('keeps reading on the same channel for images that are asked for later', async () => {
  const { phone, paths } = await feedWithImages();
  const before = phone.handshakes();

  await readAll(phone.media, paths.slice(0, 3));
  await readAll(phone.media, paths.slice(3));

  expect(phone.handshakes() - before).toBe(1);
});

it('records what a Feed of images costs over bad Wi-Fi, a channel each and on one', async () => {
  const { phone, paths } = await feedWithImages(badWifi);

  const timed = async (
    read: typeof fetch,
  ): Promise<{ ms: number; handshakes: number }> => {
    const handshakesBefore = phone.handshakes();
    const started = performance.now();

    await readAll(read, paths);

    return {
      ms: performance.now() - started,
      handshakes: phone.handshakes() - handshakesBefore,
    };
  };

  // Alternated, so neither pays alone for a cold cipher.
  const runs = [phone.fetch, phone.media, phone.fetch, phone.media];
  const results: Awaited<ReturnType<typeof timed>>[] = [];

  for (const read of runs) results.push(await timed(read));

  const lines = results.map(
    ({ ms, handshakes }) => `${Math.round(ms)} ms, ${handshakes} handshakes`,
  );

  // The harness gives each socket a link of its own, so twelve sockets have twelve times the bandwidth a phone's one radio has: read the handshakes, not the milliseconds, as the saving.
  console.info(
    `${imageCount} images over bad Wi-Fi, runs alternating a channel each and one shared channel: ${lines.join(' | ')}`,
  );

  const [firstEach, firstShared, secondEach, secondShared] = results.map(
    ({ handshakes }) => handshakes,
  );

  expect([firstEach, secondEach]).toEqual([imageCount, imageCount]);
  // The channel the first shared run opened is still there for the second unless the Server closed it for being idle.
  expect(firstShared).toBe(1);
  expect(secondShared).toBeLessThanOrEqual(1);
});
