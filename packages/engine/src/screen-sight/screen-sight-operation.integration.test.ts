import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { answerPermission, permissionJourney } from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { operationCaller, runOperation } from '#mocks/operations';
import { capturedImage } from '#mocks/screen-sight-app';
import {
  allowedScreenshot,
  journeyWithApp,
  missedNoticesOf,
  noticesOf,
  screenshot,
  stored,
} from '#mocks/screen-sight-journey';

it('asks the person first, then hands the Agent the picture', async () => {
  const journey = await journeyWithApp();

  expect(await allowedScreenshot(journey)).toEqual([
    {
      status: 'fulfilled',
      value: { status: 'captured', image: capturedImage },
    },
  ]);
  expect(journey.app.asked).toMatchObject([
    {
      requester: { kind: 'agent', sessionId: journey.session.sessionId },
    },
  ]);
}, 30_000);

it('shows the Feed one Notice and never the picture', async () => {
  const journey = await journeyWithApp();
  await allowedScreenshot(journey);

  await expect.poll(async () => (await noticesOf(journey)).length).toBe(1);
  expect(stored(journey)).not.toContain(capturedImage.data);
}, 30_000);

it('takes no picture when the person declines', async () => {
  const journey = await journeyWithApp();
  const asked = await askOperation(journey, screenshot);
  await answerPermission(journey, asked.request, 'reject_once');

  expect(await asked.outcome).toMatchObject([{ status: 'rejected' }]);
  expect(journey.app.asked).toEqual([]);
  expect(await noticesOf(journey)).toEqual([]);
  expect(await missedNoticesOf(journey)).toEqual([]);
}, 30_000);

it('refuses with off, and asks the App for nothing, while screen sight is off', async () => {
  const journey = await journeyWithApp({ enabled: false });

  expect(await allowedScreenshot(journey)).toEqual([
    { status: 'fulfilled', value: { status: 'refused', reason: 'off' } },
  ]);
  expect(journey.app.asked).toEqual([]);
  expect(await noticesOf(journey)).toEqual([]);
  await expect
    .poll(async () => (await missedNoticesOf(journey)).length)
    .toBe(1);
}, 30_000);

it('answers not_opened when no App is reachable, and never a stale picture', async () => {
  const journey = await permissionJourney();
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const asked = await askOperation(journey, screenshot);
  await answerPermission(journey, asked.request, 'allow_once');

  expect(await asked.outcome).toEqual([
    { status: 'fulfilled', value: { status: 'not_opened' } },
  ]);
  await expect
    .poll(async () => (await missedNoticesOf(journey)).length)
    .toBe(1);
}, 30_000);

it('lets the person run it without a second ask, and leaves no Notice', async () => {
  const journey = await journeyWithApp();
  const user = await operationCaller(journey.host);

  expect(await runOperation(user.operations, screenshot)).toEqual({
    status: 'captured',
    image: capturedImage,
  });

  expect(journey.app.asked).toMatchObject([{ requester: { kind: 'person' } }]);

  const snapshot = await waitForAcpSnapshot(
    journey.host,
    journey.session.sessionId,
    () => true,
  );

  expect(snapshot.pendingPermission).toBeNull();
}, 30_000);
