import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import {
  answerPermission,
  permissionJourney,
  type PermissionJourney,
} from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import { operationCaller, runOperation } from '#mocks/operations';
import {
  capturedImage,
  connectScreenSightApp,
  type ScreenSightApp,
  type ScreenSightAppOptions,
} from '#mocks/screen-sight-app';

const screenshot = { id: 'app.screenshot', params: {} } as const;

type Journey = PermissionJourney & { app: ScreenSightApp };

async function journeyWithApp(
  options?: ScreenSightAppOptions,
): Promise<Journey> {
  const journey = await permissionJourney();
  const app = connectScreenSightApp(journey.host.url, options);
  await app.ready;
  await beginHeldTurn(journey.host, journey.session.sessionId);

  return { ...journey, app };
}

// Asks as the Agent and has the person allow it once.
async function allowedScreenshot(
  journey: Journey,
): Promise<PromiseSettledResult<unknown>[]> {
  const asked = await askOperation(journey, screenshot);
  await answerPermission(journey, asked.request, 'allow_once');

  return asked.outcome;
}

// Everything the Server stored: Feed rows, with the Notices and Tool calls among them.
const stored = (journey: Journey): string =>
  JSON.stringify(journey.host.database.select().from(feedRow).all());

const noticesOf = async (journey: Journey): Promise<SessionUpdate[]> =>
  (
    await journey.host.caller.feed.page({
      sessionId: journey.session.sessionId,
      direction: 'tail',
    })
  ).rows.filter(
    (row) => row.sessionUpdate === 'notice' && row.title === 'Screen captured',
  );

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
}, 30_000);

it('refuses with off, and asks the App for nothing, while screen sight is off', async () => {
  const journey = await journeyWithApp({ enabled: false });

  expect(await allowedScreenshot(journey)).toEqual([
    { status: 'fulfilled', value: { status: 'refused', reason: 'off' } },
  ]);
  expect(journey.app.asked).toEqual([]);
  expect(await noticesOf(journey)).toEqual([]);
}, 30_000);

it('answers not_opened when no App is reachable, and never a stale picture', async () => {
  const journey = await permissionJourney();
  await beginHeldTurn(journey.host, journey.session.sessionId);

  const asked = await askOperation(journey, screenshot);
  await answerPermission(journey, asked.request, 'allow_once');

  expect(await asked.outcome).toEqual([
    { status: 'fulfilled', value: { status: 'not_opened' } },
  ]);
}, 30_000);

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
}, 60_000);

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
