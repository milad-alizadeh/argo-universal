import type { PromptRequest } from '@agentclientprotocol/sdk';
import { ProjectSchedule } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { delegationJourney } from '#mocks/session-delegation';

const fixtureProjectId = 'project-1';

const textPrompt = (text: string): { type: 'text'; text: string }[] => [
  { type: 'text', text },
];

it('creates one Session when a task Schedule is saved and Run now prompts it without moving its deadline', async () => {
  const instructions = 'Review the build';
  const received: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { prompt: instructions, requests: received },
        { prompt: instructions, requests: received },
      ],
    },
  });

  const { project, session } = host.caller;

  const schedule = await project.scheduleCreate({
    projectId: fixtureProjectId,
    agent: 'mock',
    instructions,
    cadence: { type: 'interval' as const, intervalSeconds: 60 },
  });

  expect(schedule).toMatchObject({
    checkout: { type: 'worktree' },
    sessionId: expect.any(String),
    latestSessionId: schedule.sessionId,
  });

  const opened = await session.get({ sessionId: schedule.sessionId });
  expect(opened).toMatchObject({
    projectId: fixtureProjectId,
    checkout: { type: 'worktree' },
    title: instructions,
  });
  const [registered] = await project.list();
  expect(opened.checkout.path).not.toBe(registered?.path);
  expect(received).toHaveLength(0);

  const target = { projectId: schedule.projectId, id: schedule.id };
  const first = await project.scheduleRunNow(target);
  expect(first).toMatchObject({
    outcome: 'started',
    sessionId: schedule.sessionId,
  });
  await expect.poll(() => received.length).toBe(1);
  await waitForAcpSessionIdle(host, schedule.sessionId);

  const second = await project.scheduleRunNow(target);
  expect(second).toMatchObject({ sessionId: schedule.sessionId });
  await expect.poll(() => received.length).toBe(2);

  expect(await project.scheduleList({})).toMatchObject([
    { id: schedule.id, sessionId: schedule.sessionId, nextAt: schedule.nextAt },
  ]);
  expect((await session.list({ archived: false })).sessions).toHaveLength(1);
}, 30000);

it('prompts the same Session at every occurrence and starts no other Session', async () => {
  const instructions = 'Summarize new issues';
  const received: PromptRequest[] = [];
  const reply = { prompt: instructions, requests: received };

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [reply, reply, reply] },
  });

  const { project, session, feed } = host.caller;

  const schedule = await project.scheduleCreate({
    projectId: fixtureProjectId,
    agent: 'mock',
    instructions,
    checkout: { type: 'main' },
    cadence: { type: 'interval' as const, intervalSeconds: 1 },
  });

  await expect.poll(() => received.length, { timeout: 15000 }).toBe(3);
  await project.scheduleManage({
    projectId: fixtureProjectId,
    id: schedule.id,
    action: 'pause',
  });
  await waitForAcpSessionIdle(host, schedule.sessionId);

  const { sessions } = await session.list({ archived: false });
  expect(sessions.map(({ sessionId }) => sessionId)).toEqual([
    schedule.sessionId,
  ]);

  const page = await feed.page({
    sessionId: schedule.sessionId,
    direction: 'tail',
  });

  const scheduled = page.rows.filter(
    (row) =>
      row.sessionUpdate === 'prompt_message' &&
      row._meta?.argo?.sender?.type === 'schedule',
  );

  expect(scheduled).toHaveLength(3);
}, 30000);

it('queues an occurrence that fires while the Session is busy and sends it when the Turn ends', async () => {
  const gate = Promise.withResolvers<void>();
  const instructions = 'Keep checking the build';
  const received: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        {
          prompt: instructions,
          requests: received,
          steps: [{ type: 'gate', waitFor: gate.promise }],
        },
        { prompt: instructions, requests: received },
      ],
    },
  });

  const { project, session } = host.caller;

  try {
    const schedule = await project.scheduleCreate({
      projectId: fixtureProjectId,
      agent: 'mock',
      instructions,
      cadence: { type: 'interval' as const, intervalSeconds: 1 },
    });

    await expect.poll(() => received.length, { timeout: 8000 }).toBe(1);
    await expect
      .poll(() => session.get({ sessionId: schedule.sessionId }), {
        timeout: 8000,
      })
      .toMatchObject({
        promptQueue: { items: [{ prompt: textPrompt(instructions) }] },
      });
    expect(received).toHaveLength(1);
    expect((await session.list({ archived: false })).sessions).toHaveLength(1);
  } finally {
    gate.resolve();
  }

  await expect.poll(() => received.length, { timeout: 8000 }).toBe(2);
}, 30000);

it('delivers a stored task Schedule into its Session after restart', async () => {
  const host = await startAcpEngine();
  const instructions = 'Check the main Checkout';

  const saved = await host.caller.project.scheduleCreate({
    projectId: fixtureProjectId,
    agent: 'mock',
    instructions,
    checkout: { type: 'main' },
    cadence: { type: 'interval' as const, intervalSeconds: 1 },
  });

  await host.stop();

  const received: PromptRequest[] = [];

  const reopened = await startAcpEngine({
    steps: [],
    restartOver: host.home,
    responses: {
      'session/prompt': [{ prompt: instructions, requests: received }],
    },
  });

  await expect
    .poll(() => received[0]?.prompt, { timeout: 8000 })
    .toEqual(textPrompt(instructions));
  expect(
    await reopened.caller.project.scheduleList({ projectId: fixtureProjectId }),
  ).toMatchObject([{ id: saved.id, sessionId: saved.sessionId }]);
  expect(
    await reopened.caller.session.get({ sessionId: saved.sessionId }),
  ).toMatchObject({ checkout: { type: 'main' } });
}, 30000);

it('attributes a run to the stored Project Schedule when an Agent created it', async () => {
  const instructions = 'Review the build once an hour';

  const journey = await delegationJourney({
    replies: [{ prompt: instructions }],
  });

  const { project, feed } = journey.host.caller;

  const input = {
    projectId: fixtureProjectId,
    agent: 'mock',
    instructions,
    cadence: { type: 'interval' as const, intervalSeconds: 3600 },
  };

  const saved = ProjectSchedule.parse(
    await runOperation(journey.caller.caller.operations, {
      id: 'project.scheduleCreate',
      params: input,
    }),
  );

  expect(saved).toMatchObject({
    ...input,
    nextAt: expect.any(Number),
    checkout: { type: 'worktree' },
  });
  expect(await project.scheduleList({})).toMatchObject([input]);

  await project.scheduleRunNow({ id: saved.id, projectId: saved.projectId });

  await expect
    .poll(
      async () =>
        (await feed.page({ sessionId: saved.sessionId, direction: 'tail' }))
          .rows[0],
    )
    .toMatchObject({
      sessionUpdate: 'prompt_message',
      content: textPrompt(instructions),
      _meta: {
        argo: {
          sender: { type: 'schedule', scheduleId: saved.id, title: 'Schedule' },
        },
      },
    });
}, 30000);

it('fires a Schedule made inside a task Schedule’s Session into that Session and keeps it out of Scheduled', async () => {
  const followUpText = 'Check the deploy';
  const received: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ prompt: followUpText, requests: received }],
    },
  });

  const { project, session } = host.caller;

  const task = await project.scheduleCreate({
    projectId: fixtureProjectId,
    agent: 'mock',
    instructions: 'Give me a daily update',
    checkout: { type: 'main' },
    cadence: { type: 'interval' as const, intervalSeconds: 3600 },
  });

  const followUp = await session.schedulePrompt({
    sessionId: task.sessionId,
    intervalSeconds: 1,
    prompt: textPrompt(followUpText),
  });

  expect(await project.scheduleList({})).toMatchObject([{ id: task.id }]);
  expect(await session.listSchedules({ sessionId: task.sessionId })).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: task.id, listed: true }),
      expect.objectContaining({ id: followUp.id, listed: false }),
    ]),
  );
  await expect
    .poll(() => received[0]?.prompt, { timeout: 8000 })
    .toEqual(textPrompt(followUpText));
  expect((await session.list({ archived: false })).sessions).toHaveLength(1);
}, 30000);

it('runs in the saved main Checkout without changing the Project’s remembered Checkout', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { project, session } = host.caller;
  const projectId = fixtureProjectId;
  const checkoutChoice = { type: 'worktree', baseBranch: 'main' } as const;
  await project.update({ projectId, checkoutChoice });

  const schedule = await project.scheduleCreate({
    projectId,
    agent: 'mock',
    instructions: 'Check the main Checkout',
    checkout: { type: 'main' },
    cadence: { type: 'interval' as const, intervalSeconds: 60 },
  });

  expect(await session.get({ sessionId: schedule.sessionId })).toMatchObject({
    checkout: { type: 'main' },
  });
  expect(
    (await project.list()).find(({ id }) => id === projectId),
  ).toMatchObject({
    checkoutChoice,
  });
}, 30000);
