import { stat } from 'node:fs/promises';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import { afterEach, expect, it, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const projectId = 'project-1';

const instructions = 'Review the build';

const oneHourMs = 60 * 60 * 1000;

afterEach(() => {
  vi.useRealTimers();
});

const input = {
  projectId,
  agent: 'mock',
  instructions,
  cadence: { type: 'interval' as const, intervalSeconds: 60 },
};

it('leaves its Session and Checkout as an ordinary Session when a task Schedule is deleted', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { project, session } = host.caller;
  const saved = await project.scheduleCreate(input);
  const before = await session.get({ sessionId: saved.sessionId });

  await project.scheduleManage({ projectId, id: saved.id, action: 'delete' });

  expect(await project.scheduleList({ projectId })).toEqual([]);
  expect(await session.listSchedules({ sessionId: saved.sessionId })).toEqual(
    [],
  );
  expect(await session.get({ sessionId: saved.sessionId })).toMatchObject({
    checkout: before.checkout,
    archivedAt: null,
  });
  expect((await stat(before.checkout.path)).isDirectory()).toBe(true);
}, 30000);

it('edits the instructions of a paused task Schedule and keeps its Agent and Checkout', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { project } = host.caller;
  const saved = await project.scheduleCreate(input);
  const target = { projectId, id: saved.id };

  await project.scheduleManage({ ...target, action: 'pause' });

  const edited = await project.scheduleEdit({
    ...input,
    id: saved.id,
    instructions: 'Summarize this build',
  });

  expect(edited).toMatchObject({
    instructions: 'Summarize this build',
    paused: true,
    nextAt: saved.nextAt,
    sessionId: saved.sessionId,
  });
  await expect(
    project.scheduleEdit({
      ...input,
      id: saved.id,
      checkout: { type: 'main' },
    }),
  ).rejects.toThrow('belong to its Session');

  await project.scheduleManage({ ...target, action: 'resume' });
  expect(await project.scheduleList({ projectId })).toMatchObject([
    { id: saved.id, paused: false, nextAt: saved.nextAt },
  ]);
}, 30000);

it('pauses a task Schedule whose Session is archived', async () => {
  const host = await startAcpEngine({ steps: [] });
  const { project, session } = host.caller;

  const saved = await project.scheduleCreate({
    ...input,
    checkout: { type: 'main' },
    cadence: { type: 'interval', intervalSeconds: 1 },
  });

  await waitForAcpSessionIdle(host, saved.sessionId);
  await session.archive({ sessionId: saved.sessionId });

  await expect
    .poll(async () => (await project.scheduleList({ projectId }))[0]?.paused, {
      timeout: 8000,
    })
    .toBe(true);
}, 30000);

it('skips an occurrence missed by more than an hour once and starts no backlog after restart', async () => {
  const host = await startAcpEngine();

  const saved = await host.caller.project.scheduleCreate({
    ...input,
    cadence: { type: 'interval', intervalSeconds: 2 },
  });

  await host.stop();
  const returnedAt = saved.nextAt + oneHourMs + 1000;
  vi.useFakeTimers({
    toFake: ['Date'],
    now: returnedAt,
    shouldAdvanceTime: true,
  });

  const requests: PromptRequest[] = [];

  const reopened = await startAcpEngine({
    steps: [],
    restartOver: host.home,
    responses: { 'session/prompt': [{ prompt: instructions, requests }] },
  });

  const { session } = reopened.caller;

  await expect
    .poll(
      async () =>
        (await session.listSchedules({ sessionId: saved.sessionId }))[0]
          ?.lastSkippedAt,
    )
    .toBeGreaterThanOrEqual(returnedAt);

  await expect.poll(() => requests.length, { timeout: 5000 }).toBe(1);

  const [schedule] = await session.listSchedules({
    sessionId: saved.sessionId,
  });

  expect(schedule?.nextAt).toBeGreaterThan(returnedAt);
}, 30000);

it('sends an occurrence late when the Server returns within an hour', async () => {
  const host = await startAcpEngine();

  const saved = await host.caller.project.scheduleCreate({
    ...input,
    cadence: { type: 'interval', intervalSeconds: 3600 },
  });

  await host.stop();
  vi.useFakeTimers({
    toFake: ['Date'],
    now: saved.nextAt + oneHourMs - 60_000,
    shouldAdvanceTime: true,
  });

  const requests: PromptRequest[] = [];

  const reopened = await startAcpEngine({
    steps: [],
    restartOver: host.home,
    responses: { 'session/prompt': [{ prompt: instructions, requests }] },
  });

  await expect.poll(() => requests.length, { timeout: 5000 }).toBe(1);
  expect(
    await reopened.caller.session.listSchedules({ sessionId: saved.sessionId }),
  ).toMatchObject([{ lastQueuedAt: expect.any(Number), lastSkippedAt: null }]);
}, 30000);
