import { expect, it } from 'vitest';
import { answerPermission, permissionJourney } from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { connectScreenSightApp } from '#mocks/screen-sight-app';
import {
  allowedScreenshot,
  journeyWithApp,
  missedNoticesOf,
  noticesOf,
  screenshot,
} from '#mocks/screen-sight-journey';

it('does not reach an App that is not the desktop App', async () => {
  const journey = await permissionJourney();

  for (const platform of ['web', 'ios', 'android'] as const) {
    await connectScreenSightApp(journey.host.url, { surface: { platform } })
      .ready;
  }

  await beginHeldTurn(journey.host, journey.session.sessionId);

  const asked = await askOperation(journey, screenshot);
  await answerPermission(journey, asked.request, 'allow_once');

  expect(await asked.outcome).toEqual([
    { status: 'fulfilled', value: { status: 'not_opened' } },
  ]);
}, 30_000);

it('tells the Agent why when the person declines the display prompt or the App cannot capture', async () => {
  const declined = await journeyWithApp({
    answer: () => ({ status: 'refused', reason: 'declined' }),
  });

  expect(await allowedScreenshot(declined)).toEqual([
    { status: 'fulfilled', value: { status: 'refused', reason: 'declined' } },
  ]);
  await expect
    .poll(async () => (await missedNoticesOf(declined)).length)
    .toBe(1);

  const missing = await journeyWithApp({
    answer: () => ({
      status: 'not_available',
      reason: 'Grant Screen Recording to Argo in System Settings.',
    }),
  });

  expect(await allowedScreenshot(missing)).toEqual([
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
