import { expect, it } from 'vitest';
import { permissionJourney } from '#mocks/native-permission';
import { connectScreenSightApp } from '#mocks/screen-sight-app';
import {
  agentScreenshot,
  journeyWithApp,
  missedNoticesOf,
  noticesOf,
} from '#mocks/screen-sight-journey';

it('does not reach an App that is not the desktop App', async () => {
  const journey = await permissionJourney();

  for (const platform of ['web', 'ios', 'android'] as const) {
    await connectScreenSightApp(journey.host.url, { surface: { platform } })
      .ready;
  }

  expect(await agentScreenshot(journey)).toEqual([
    { status: 'fulfilled', value: { status: 'not_opened' } },
  ]);
}, 30_000);

it('tells the Agent why when the App cannot capture', async () => {
  const missing = await journeyWithApp({
    answer: () => ({
      status: 'not_available',
      reason: 'Grant Screen Recording to Argo in System Settings.',
    }),
  });

  expect(await agentScreenshot(missing)).toEqual([
    {
      status: 'fulfilled',
      value: {
        status: 'not_available',
        reason: 'Grant Screen Recording to Argo in System Settings.',
      },
    },
  ]);
  expect(await noticesOf(missing)).toEqual([]);
  await expect
    .poll(async () => (await missedNoticesOf(missing)).length)
    .toBe(1);
}, 60_000);
