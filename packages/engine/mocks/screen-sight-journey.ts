import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import {
  answerPermission,
  permissionJourney,
  type PermissionJourney,
} from '#mocks/native-permission';
import { askOperation } from '#mocks/operation-permissions';
import { beginHeldTurn } from '#mocks/operation-race';
import {
  connectScreenSightApp,
  type ScreenSightApp,
  type ScreenSightAppOptions,
} from '#mocks/screen-sight-app';

export const screenshot = { id: 'app.screenshot', params: {} } as const;

export type Journey = PermissionJourney & { app: ScreenSightApp };

export async function journeyWithApp(
  options?: ScreenSightAppOptions,
): Promise<Journey> {
  const journey = await permissionJourney();
  const app = connectScreenSightApp(journey.host.url, options);
  await app.ready;
  await beginHeldTurn(journey.host, journey.session.sessionId);

  return { ...journey, app };
}

// Asks as the Agent and has the person allow it once.
export async function allowedScreenshot(
  journey: Journey,
): Promise<PromiseSettledResult<unknown>[]> {
  const asked = await askOperation(journey, screenshot);
  await answerPermission(journey, asked.request, 'allow_once');

  return asked.outcome;
}

// Everything the Server stored: Feed rows, with the Notices and Tool calls among them.
export const stored = (journey: Journey): string =>
  JSON.stringify(journey.host.database.select().from(feedRow).all());

export const noticesOf = async (
  journey: PermissionJourney,
): Promise<SessionUpdate[]> =>
  (
    await journey.host.caller.feed.page({
      sessionId: journey.session.sessionId,
      direction: 'tail',
    })
  ).rows.filter(
    (row) => row.sessionUpdate === 'notice' && row.title === 'Screen captured',
  );

export const missedNoticesOf = async (
  journey: PermissionJourney,
): Promise<SessionUpdate[]> =>
  (
    await journey.host.caller.feed.page({
      sessionId: journey.session.sessionId,
      direction: 'tail',
    })
  ).rows.filter(
    (row) =>
      row.sessionUpdate === 'notice' && row.title === 'Screen not captured',
  );
