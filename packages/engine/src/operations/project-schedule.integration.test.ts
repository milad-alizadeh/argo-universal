import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { runOperation } from '#mocks/operations';
import { delegationJourney } from '#mocks/session-delegation';

it('runs a Project Schedule in a fresh worktree without moving its deadline', async () => {
  const instructions = 'Review the build';
  const received: PromptRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ prompt: instructions, requests: received }],
    },
  });
  const { project, session } = host.caller;

  const schedule = await project.scheduleCreate({
    projectId: 'project-1',
    agent: 'mock',
    instructions,
    intervalSeconds: 60,
  });

  expect(schedule.checkout.type).toBe('worktree');
  expect(schedule.latestSessionId).toBeNull();

  const occurrence = await project.scheduleRunNow({
    projectId: schedule.projectId,
    id: schedule.id,
  });

  expect(occurrence.outcome).toBe('started');
  if (occurrence.outcome !== 'started') throw new Error('Expected a Session');
  const opened = await session.get({ sessionId: occurrence.sessionId });
  expect(opened).toMatchObject({
    projectId: 'project-1',
    checkout: { type: 'worktree' },
  });
  expect(await project.scheduleList({})).toMatchObject([
    {
      id: schedule.id,
      latestSessionId: occurrence.sessionId,
      nextAt: schedule.nextAt,
    },
  ]);
  const [registered] = await project.list();
  expect(opened.checkout.path).not.toBe(registered?.path);
  await expect.poll(() => received.length).toBe(1);
  await waitForAcpSessionIdle(host, occurrence.sessionId);

  const again = await project.scheduleRunNow({
    projectId: schedule.projectId,
    id: schedule.id,
  });
  if (again.outcome !== 'started') throw new Error('Expected another Session');
  const second = await session.get({ sessionId: again.sessionId });
  expect(again.sessionId).not.toBe(occurrence.sessionId);
  expect(second.checkout.path).not.toBe(opened.checkout.path);
}, 30000);

it('delivers a stored Project Schedule through the normal Session path after restart', async () => {
  const host = await startAcpEngine();
  const instructions = 'Check the main Checkout';
  const saved = await host.caller.project.scheduleCreate({
    projectId: 'project-1',
    agent: 'mock',
    instructions,
    checkout: { type: 'main' },
    intervalSeconds: 1,
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
  const { project, session } = reopened.caller;
  const read = async () =>
    (await project.scheduleList({ projectId: 'project-1' }))[0];
  await expect
    .poll(async () => (await read())?.latestSessionId, { timeout: 8000 })
    .not.toBeNull();

  const delivered = await read();
  expect(delivered).toMatchObject({ id: saved.id, checkout: { type: 'main' } });
  expect(delivered?.latestSessionId).toBeTruthy();
  if (!delivered?.latestSessionId) throw new Error('Expected a Session');
  expect(
    await session.get({ sessionId: delivered.latestSessionId }),
  ).toMatchObject({
    checkout: { type: 'main' },
  });
  expect(received[0]?.prompt).toEqual([{ type: 'text', text: instructions }]);
}, 30000);

it('skips Run now while an automatic Session is working', async () => {
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
      ],
    },
  });
  const { project } = host.caller;

  try {
    const schedule = await project.scheduleCreate({
      projectId: 'project-1',
      agent: 'mock',
      instructions,
      intervalSeconds: 1,
    });
    await expect.poll(() => received.length, { timeout: 8000 }).toBe(1);
    const target = { id: schedule.id, projectId: schedule.projectId };
    const outcome = await project.scheduleRunNow(target);
    expect(outcome).toMatchObject({
      outcome: 'skipped',
      reason: expect.stringContaining('still working'),
    });
    await expect
      .poll(async () => (await project.scheduleList({}))[0]?.nextAt, {
        timeout: 8000,
      })
      .toBeGreaterThan(schedule.nextAt + 1000);
    expect(received).toHaveLength(1);
  } finally {
    gate.resolve();
  }
}, 30000);

it('allows the Agent to save a Project Schedule for its own explicitly named Project', async () => {
  const journey = await delegationJourney();
  const instructions = 'Review the build once an hour';
  const input = {
    projectId: 'project-1',
    agent: 'mock',
    instructions,
    intervalSeconds: 3600,
  };

  const saved = await runOperation(journey.caller.caller.operations, {
    id: 'project.scheduleCreate',
    params: input,
  });

  expect(saved).toMatchObject({
    ...input,
    nextAt: expect.any(Number),
    checkout: { type: 'worktree' },
  });
  expect(await journey.host.caller.project.scheduleList({})).toMatchObject([
    input,
  ]);
}, 30000);
