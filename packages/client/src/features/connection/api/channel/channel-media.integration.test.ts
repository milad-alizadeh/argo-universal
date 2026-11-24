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

const rounds = 3;

const median = (values: number[]): number =>
  [...values].sort((left, right) => left - right)[
    Math.floor(values.length / 2)
  ] ?? 0;

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

  // Each reader is new, so each starts from a cold channel; the three take turns, three times, so none pays alone for a cold cipher.
  const readers = {
    'a channel each': (): typeof fetch => phone.fetch,
    'one channel, one at a time': (): typeof fetch => phone.mediaWindow(1),
    'one channel, four at a time': (): typeof fetch => phone.mediaWindow(4),
  };

  const times: Record<string, number[]> = {};
  const handshakes: Record<string, number> = {};

  for (let round = 0; round < rounds; round += 1)
    for (const [name, reader] of Object.entries(readers)) {
      const run = await timed(reader());
      times[name] = [...(times[name] ?? []), run.ms];
      handshakes[name] = run.handshakes;
    }

  // One bandwidth is shared by every socket (`slowNetwork`), as a phone's one radio is.
  console.info(
    `${imageCount} images over bad Wi-Fi, median of ${rounds}: ${Object.entries(
      times,
    )
      .map(
        ([name, values]) =>
          `${name} ${Math.round(median(values))} ms, ${handshakes[name]} handshakes`,
      )
      .join(' | ')}`,
  );

  expect(handshakes['a channel each']).toBe(imageCount);
  expect(handshakes['one channel, one at a time']).toBe(1);
  expect(handshakes['one channel, four at a time']).toBe(1);
}, 120_000);
