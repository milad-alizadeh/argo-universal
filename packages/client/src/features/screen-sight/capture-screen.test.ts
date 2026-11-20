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

const macSetting = 'Screen Recording';

const unreadable = (): DOMException =>
  new DOMException('Denied', 'NotReadableError');

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

it('says what to grant when a Mac will not let the App read the screen', async () => {
  expect(
    await captureScreen(
      port({
        onMac: true,
        getDisplayMedia: () => Promise.reject(unreadable()),
      }),
    ),
  ).toMatchObject({
    status: 'not_available',
    reason: expect.stringContaining(macSetting),
  });
});

it('names the real failure, and no Mac setting, for any other error', async () => {
  const answer = await captureScreen(
    port({ frameOf: () => Promise.reject(new Error('black frame')) }),
  );

  expect(answer).toMatchObject({
    status: 'not_available',
    reason: expect.stringContaining('black frame'),
  });
  expect(JSON.stringify(answer)).not.toContain(macSetting);
});

it('does not send a Mac setting to a machine that is not a Mac', async () => {
  const answer = await captureScreen(
    port({
      onMac: false,
      getDisplayMedia: () => Promise.reject(unreadable()),
    }),
  );

  expect(JSON.stringify(answer)).not.toContain(macSetting);
});
