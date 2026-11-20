import { expect, it } from 'vitest';
import {
  captureScreen,
  type DisplayStream,
  type ScreenCapturePort,
} from './capture-screen';

const stopped: string[] = [];

const streamOf = (name: string): DisplayStream => ({
  getTracks: () => [{ stop: (): number => stopped.push(name) }],
});

const port = (overrides: Partial<ScreenCapturePort>): ScreenCapturePort => ({
  getDisplayMedia: () => Promise.resolve(streamOf('screen')),
  frameOf: () => Promise.resolve('cGl4ZWxz'),
  ...overrides,
});

it('answers the picture and stops the stream', async () => {
  expect(await captureScreen(port({}))).toEqual({
    status: 'captured',
    image: { mimeType: 'image/png', data: 'cGl4ZWxz' },
  });
  expect(stopped).toContain('screen');
});

it('answers declined when the person closes the share prompt', async () => {
  expect(
    await captureScreen(
      port({
        getDisplayMedia: () =>
          Promise.reject(new DOMException('No', 'NotAllowedError')),
      }),
    ),
  ).toEqual({ status: 'refused', reason: 'declined' });
});

it('says what to grant when the system will not let the App capture', async () => {
  expect(
    await captureScreen(
      port({ frameOf: () => Promise.reject(new Error('black frame')) }),
    ),
  ).toMatchObject({
    status: 'not_available',
    reason: expect.stringContaining('Screen Recording'),
  });
});
