import { expect, it } from 'vitest';
import {
  captureMainScreen,
  type ScreenPort,
  type ScreenSource,
} from './screen-capture';

const main: ScreenSource = { displayId: '1', png: 'bWFpbg==' };

const other: ScreenSource = { displayId: '2', png: 'b3RoZXI=' };

const port = (overrides: Partial<ScreenPort> = {}): ScreenPort => ({
  platform: 'darwin',
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

it('says what to grant when a Mac has not allowed Screen Recording', async () => {
  expect(await captureMainScreen(port({ access: () => 'denied' }))).toEqual({
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
