import { expect, it, vi } from 'vitest';
import {
  captureMainScreen,
  type ScreenPort,
  type ScreenSource,
} from './screen-capture';

const main: ScreenSource = { displayId: '1', png: 'bWFpbg==' };

const other: ScreenSource = { displayId: '2', png: 'b3RoZXI=' };

const port = (overrides: Partial<ScreenPort> = {}): ScreenPort => ({
  platform: 'darwin',
  enabled: () => true,
  access: () => 'granted',
  mainDisplayId: () => '1',
  sources: () => Promise.resolve([other, main]),
  ...overrides,
});

it('answers a picture of the main display', async () => {
  expect(await captureMainScreen(port())).toEqual({
    status: 'captured',
    image: { mimeType: 'image/png', data: 'bWFpbg==' },
  });
});

it('attempts capture on a Mac that has never asked for Screen Recording', async () => {
  const sources = vi.fn<ScreenPort['sources']>(() =>
    Promise.reject('Failed to get sources.'),
  );

  await captureMainScreen(port({ access: () => 'denied', sources }));

  expect(sources).toHaveBeenCalled();
});

it('says what to grant when a Mac has not allowed Screen Recording', async () => {
  const answer = await captureMainScreen(
    port({
      access: () => 'denied',
      sources: () => Promise.reject('Failed to get sources.'),
    }),
  );

  expect(answer).toEqual({
    status: 'not_available',
    reason: expect.stringContaining('Screen Recording'),
  });
});

it('names no Mac setting on another system', async () => {
  const answer = await captureMainScreen(
    port({ platform: 'linux', sources: () => Promise.resolve([]) }),
  );

  expect(answer).toMatchObject({ status: 'not_available' });
  expect(JSON.stringify(answer)).not.toContain('Screen Recording');
});

it('says the screen could not be read when the picture comes back empty', async () => {
  expect(
    await captureMainScreen(
      port({ sources: () => Promise.resolve([{ displayId: '1', png: '' }]) }),
    ),
  ).toMatchObject({ status: 'not_available' });
});

it('says why when the system refuses the capture', async () => {
  expect(
    await captureMainScreen(
      port({
        sources: () => Promise.reject(new Error('Failed to get sources')),
      }),
    ),
  ).toEqual({
    status: 'not_available',
    reason: expect.stringContaining('Failed to get sources'),
  });
});

it('refuses with off, and reads nothing, until the person turned screen sight on', async () => {
  let read = false;

  const answer = await captureMainScreen(
    port({
      enabled: () => false,
      sources: () => {
        read = true;

        return Promise.resolve([main]);
      },
    }),
  );

  expect(answer).toEqual({ status: 'refused', reason: 'off' });
  expect(read).toBe(false);
});
