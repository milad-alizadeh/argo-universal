import { expect, it } from 'vitest';
import {
  answerDisplayRequests,
  type Display,
  type DisplayPort,
  type DisplayRequest,
} from './display-media';

const origin = 'http://127.0.0.1:7337';

const main: Display = { id: 'screen:1:0', name: 'Main display' };

// A page asks to share a display; resolves to what it was given.
async function ask(request: DisplayRequest): Promise<Display | null> {
  let listener: Parameters<DisplayPort['onRequest']>[0] | undefined;

  answerDisplayRequests(
    {
      onRequest: (given): void => {
        listener = given;
      },
      displays: () => Promise.resolve([main]),
    },
    origin,
  );

  return new Promise((resolve) => listener?.(request, resolve));
}

it('shares the main display with the App’s own page', async () => {
  expect(await ask({ securityOrigin: origin, videoRequested: true })).toEqual(
    main,
  );
});

it('shares nothing with another origin, or when no picture is asked for', async () => {
  expect(
    await ask({ securityOrigin: 'https://example.com', videoRequested: true }),
  ).toBeNull();
  expect(
    await ask({ securityOrigin: origin, videoRequested: false }),
  ).toBeNull();
});
