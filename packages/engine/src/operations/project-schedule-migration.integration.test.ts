import { join } from 'node:path';
import { migrationsFolder, openDatabase } from '@repo/db';
import { projectSchedule } from '@repo/db/schema';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { insertSession } from '#mocks/database';

const projectId = 'project-1';

const liveRun = 'live-run';

const archivedRun = 'archived-run';

const cadence = {
  type: 'weekdays',
  localTime: '09:00',
  timeZone: 'Europe/London',
} as const;

const settings = (instructions: string): string =>
  JSON.stringify({
    agent: 'mock',
    instructions,
    name: instructions,
    cadence,
    checkout: { type: 'main' },
    configOptions: [],
    anchorAt: Date.now(),
  });

it('gives each existing Project Schedule one Session and keeps its cadence, instructions and pause', async () => {
  const host = await startAcpEngine({ steps: [] });
  const [registered] = await host.caller.project.list();
  const nextAt = Date.now() + 3_600_000;
  await host.stop();

  const database = openDatabase(join(host.home, 'argo.db'), migrationsFolder);

  try {
    const checkoutPath = registered?.path ?? host.home;
    insertSession(database, { id: liveRun, checkoutPath });
    insertSession(database, {
      id: archivedRun,
      checkoutPath,
      archivedAt: Date.now(),
    });
    database
      .insert(projectSchedule)
      .values([
        {
          id: 'adopts-run',
          projectId,
          settings: settings('Give me a daily update'),
          nextAt,
          latestSessionId: liveRun,
          paused: false,
        },
        {
          id: 'creates-session',
          projectId,
          settings: settings('Check the nightly build'),
          nextAt,
          latestSessionId: archivedRun,
          paused: true,
        },
      ])
      .run();
  } finally {
    database.$client.close();
  }

  const reopened = await startAcpEngine({
    steps: [],
    restartOver: host.home,
  });

  const { project, session } = reopened.caller;

  await expect
    .poll(async () => (await project.scheduleList({ projectId })).length, {
      timeout: 8000,
    })
    .toBe(2);

  const schedules = await project.scheduleList({ projectId });
  const adopted = schedules.find(({ id }) => id === 'adopts-run');
  const created = schedules.find(({ id }) => id === 'creates-session');

  expect(adopted).toMatchObject({
    sessionId: liveRun,
    instructions: 'Give me a daily update',
    cadence,
    nextAt,
    paused: false,
  });
  expect(created).toMatchObject({
    instructions: 'Check the nightly build',
    cadence,
    nextAt,
    paused: true,
  });
  expect(created?.sessionId).not.toBe(archivedRun);

  if (!created) throw new Error('Expected the migrated Schedule');
  expect(await session.get({ sessionId: created.sessionId })).toMatchObject({
    archivedAt: null,
    checkout: { type: 'main' },
  });
}, 30000);
