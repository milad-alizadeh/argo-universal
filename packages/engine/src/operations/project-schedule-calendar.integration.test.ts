import type { PromptRequest } from '@agentclientprotocol/sdk';
import {
  ProjectSchedule,
  type ProjectScheduleCadence,
} from '@repo/contracts/operations';
import { expect, it, onTestFinished, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { runOperation } from '#mocks/operations';
import { delegationJourney } from '#mocks/session-delegation';

const projectId = 'project-1';

const instructions = 'Check the nightly build';

const startOfRun = { localTime: '09:00', timeZone: 'UTC' };

interface CalendarClock {
  advanceTo: (iso: string | number) => void;
}

function calendarClock(): CalendarClock {
  const mock = vi.spyOn(Date, 'now');
  onTestFinished(() => mock.mockRestore());

  return {
    advanceTo: (instant): void => {
      mock.mockReturnValue(
        typeof instant === 'number' ? instant : Date.parse(instant),
      );
    },
  };
}

it('previews a Daily Schedule at the same local time across daylight saving', async () => {
  const { caller } = await startAcpEngine();
  const clock = calendarClock();

  const cadence = {
    type: 'daily',
    localTime: '09:00',
    timeZone: 'America/New_York',
  } as const;

  clock.advanceTo('2026-03-07T12:00:00Z');
  await expect(
    caller.project.schedulePreview({ projectId, cadence }),
  ).resolves.toEqual({
    nextAt: Date.parse('2026-03-07T14:00:00Z'),
  });

  clock.advanceTo('2026-03-08T12:00:00Z');
  await expect(
    caller.project.schedulePreview({ projectId, cadence }),
  ).resolves.toEqual({
    nextAt: Date.parse('2026-03-08T13:00:00Z'),
  });
}, 30_000);

interface PreviewCase {
  before: string;
  localTime: string;
  nextAt: string;
}

const transitionCases: readonly PreviewCase[] = [
  {
    before: '2026-03-08T05:00:00Z',
    localTime: '02:30',
    nextAt: '2026-03-08T07:30:00Z',
  },
  {
    before: '2026-11-01T04:00:00Z',
    localTime: '01:30',
    nextAt: '2026-11-01T05:30:00Z',
  },
  {
    before: '2026-11-01T05:45:00Z',
    localTime: '01:30',
    nextAt: '2026-11-02T06:30:00Z',
  },
];

it('shifts a skipped local time by its gap and offers a repeated local time once', async () => {
  const { caller } = await startAcpEngine();
  const clock = calendarClock();

  for (const { before, localTime, nextAt } of transitionCases) {
    clock.advanceTo(before);
    await expect(
      caller.project.schedulePreview({
        projectId,
        cadence: { type: 'daily', localTime, timeZone: 'America/New_York' },
      }),
    ).resolves.toEqual({ nextAt: Date.parse(nextAt) });
  }
}, 30_000);

interface CadenceCase {
  cadence: ProjectScheduleCadence;
  nextAt: string;
}

const presetCases: readonly CadenceCase[] = [
  {
    cadence: { type: 'interval', intervalSeconds: 900 },
    nextAt: '2026-03-13T09:20:00Z',
  },
  {
    cadence: { type: 'weekdays', ...startOfRun },
    nextAt: '2026-03-16T09:00:00Z',
  },
  {
    cadence: { type: 'weekly', weekdays: ['saturday'], ...startOfRun },
    nextAt: '2026-03-14T09:00:00Z',
  },
  {
    cadence: { type: 'custom', every: 2, unit: 'day', ...startOfRun },
    nextAt: '2026-03-15T09:00:00Z',
  },
];

it('previews Interval, Weekdays, Weekly and Custom day cadences', async () => {
  const { caller } = await startAcpEngine();
  calendarClock().advanceTo('2026-03-13T09:05:00Z');

  for (const { cadence, nextAt } of presetCases) {
    await expect(
      caller.project.schedulePreview({ projectId, cadence }),
    ).resolves.toEqual({
      nextAt: Date.parse(nextAt),
    });
  }
}, 30_000);

it('validates the time zone and Custom weekdays before preview or creation', async () => {
  const {
    caller: { project },
  } = await startAcpEngine();

  const invalidZone = {
    type: 'daily',
    ...startOfRun,
    timeZone: 'Unknown/Zone',
  } as const;

  await expect(
    project.schedulePreview({ projectId, cadence: invalidZone }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: expect.stringContaining('Choose a valid IANA time zone'),
  });
  await expect(
    project.scheduleCreate({
      projectId,
      agent: 'mock',
      instructions,
      cadence: { type: 'custom', every: 2, unit: 'week', ...startOfRun },
    }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: expect.stringContaining('Choose weekdays for a weekly repeat'),
  });
  expect(await project.scheduleList({ projectId })).toEqual([]);
}, 30_000);

it('rejects a Custom repeat whose second occurrence is outside the date range', async () => {
  const { caller } = await startAcpEngine();
  calendarClock().advanceTo('2026-03-09T08:00:00Z');

  const cadence = {
    type: 'custom',
    every: Number.MAX_SAFE_INTEGER,
    unit: 'day',
    ...startOfRun,
  } as const;

  await expect(
    caller.project.schedulePreview({ projectId, cadence }),
  ).rejects.toMatchObject({
    code: 'BAD_REQUEST',
    message: expect.stringContaining('within the supported date range'),
  });
}, 30_000);

const repeat: ProjectScheduleCadence = {
  type: 'custom',
  every: 2,
  unit: 'week',
  weekdays: ['monday', 'thursday'],
  ...startOfRun,
};

async function currentSchedule(
  project: Awaited<ReturnType<typeof startAcpEngine>>['caller']['project'],
): Promise<ProjectSchedule | undefined> {
  return (await project.scheduleList({ projectId }))[0];
}

const monday = Date.parse('2026-03-09T09:00:00Z');

const thursday = Date.parse('2026-03-12T09:00:00Z');

const followingCycle = Date.parse('2026-03-23T09:00:00Z');

const waitBeforeRun = 200;

it('dispatches the previewed Custom Schedule and resumes its two-week rule after restart', async () => {
  const received: PromptRequest[] = [];
  const reply = { prompt: instructions, requests: received };
  const { host, caller } = await delegationJourney({ replies: [reply] });
  const clock = calendarClock();
  const params = { projectId, cadence: repeat };

  clock.advanceTo(monday - waitBeforeRun);

  const preview = await runOperation(caller.caller.operations, {
    id: 'project.schedulePreview',
    params,
  });

  const saved = ProjectSchedule.parse(
    await runOperation(caller.caller.operations, {
      id: 'project.scheduleCreate',
      params: {
        ...params,
        agent: 'mock',
        instructions,
        checkout: { type: 'main' },
      },
    }),
  );

  expect(preview).toEqual({ nextAt: monday });
  expect(saved).toMatchObject({ cadence: repeat, nextAt: monday });
  clock.advanceTo(monday);
  await expect
    .poll(() => currentSchedule(host.caller.project))
    .toMatchObject({
      nextAt: thursday,
      latestSessionId: expect.any(String),
    });
  await expect.poll(() => received.length).toBe(1);
  await host.stop();

  clock.advanceTo(thursday - waitBeforeRun);

  const restarted = await startAcpEngine({
    steps: [],
    restartOver: host.home,
    responses: { 'session/prompt': [reply] },
  });

  expect(await currentSchedule(restarted.caller.project)).toMatchObject({
    id: saved.id,
    cadence: repeat,
    nextAt: thursday,
  });
  clock.advanceTo(thursday);
  await expect
    .poll(() => currentSchedule(restarted.caller.project))
    .toMatchObject({
      nextAt: followingCycle,
      latestSessionId: expect.any(String),
    });
  await expect.poll(() => received.length).toBe(2);
}, 30_000);
