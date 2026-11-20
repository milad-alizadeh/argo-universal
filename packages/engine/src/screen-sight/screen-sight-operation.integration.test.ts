import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { permissionJourney } from '#mocks/native-permission';
import { operationCaller, runOperation } from '#mocks/operations';
import { capturedImage } from '#mocks/screen-sight-app';
import {
  agentScreenshot,
  journeyWithApp,
  missedNoticesOf,
  noticesOf,
  screenshot,
  stored,
} from '#mocks/screen-sight-journey';

it('hands the Agent the picture without a Permission request', async () => {
  const journey = await journeyWithApp();

  expect(await agentScreenshot(journey)).toEqual([
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
  await agentScreenshot(journey);

  await expect.poll(async () => (await noticesOf(journey)).length).toBe(1);
  expect(stored(journey)).not.toContain(capturedImage.data);
}, 30_000);

it('refuses with off, because the App checks its own setting as each request arrives', async () => {
  const journey = await journeyWithApp({ enabled: false });

  expect(await agentScreenshot(journey)).toEqual([
    { status: 'fulfilled', value: { status: 'refused', reason: 'off' } },
  ]);
  expect(journey.app.asked).toHaveLength(1);
  expect(await noticesOf(journey)).toEqual([]);
  await expect
    .poll(async () => (await missedNoticesOf(journey)).length)
    .toBe(1);
}, 30_000);

it('takes a picture once the person turns screen sight on, without the App reconnecting', async () => {
  const journey = await journeyWithApp({ enabled: false });

  expect(await agentScreenshot(journey)).toEqual([
    { status: 'fulfilled', value: { status: 'refused', reason: 'off' } },
  ]);
  journey.app.setEnabled(true);

  expect(await agentScreenshot(journey)).toMatchObject([
    { status: 'fulfilled', value: { status: 'captured' } },
  ]);
}, 60_000);

it('answers not_opened when no App is reachable, and never a stale picture', async () => {
  const journey = await permissionJourney();

  expect(await agentScreenshot(journey)).toEqual([
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
