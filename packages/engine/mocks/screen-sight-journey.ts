import type { SessionUpdate } from '@repo/contracts';
import { feedRow } from '@repo/db/schema';
import {
  permissionJourney,
  type PermissionJourney,
} from '#mocks/native-permission';
import { runOperation } from '#mocks/operations';
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

  return { ...journey, app };
}

// Runs it as the Agent: no Permission request, so it just runs.
export async function agentScreenshot(
  journey: PermissionJourney,
): Promise<PromiseSettledResult<unknown>[]> {
  return Promise.allSettled([
    runOperation(journey.session.caller.operations, {
      ...screenshot,
      wait: true,
    }),
  ]);
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
