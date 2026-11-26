import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { SessionInfo } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

it('marks a task Schedule Session Unread when a run ends, not when the Schedule is saved', async (): Promise<void> => {
  const instructions = 'Review the build';
  const received: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ prompt: instructions, requests: received }],
    },
  });

  const { project, session } = host.caller;

  const controller = new AbortController();
  onTestFinished((): void => controller.abort());

  const schedule = await project.scheduleCreate({
    projectId: 'project-1',
    agent: 'mock',
    instructions,
    cadence: { type: 'interval' as const, intervalSeconds: 3600 },
  });

  // Scheduled reads a task's status from its own Session, listed with the Sessions it started.
  const listed = async (): Promise<SessionInfo[]> =>
    (await session.list({ taskSessions: 'tasks' })).sessions;

  const counts = (
    await host.createCaller({ signal: controller.signal }).session.counts()
  )[Symbol.asyncIterator]();

  expect(await listed()).toMatchObject([
    { sessionId: schedule.sessionId, status: 'idle' },
  ]);
  expect((await counts.next()).value).toMatchObject({ attention: 0 });

  await project.scheduleRunNow({
    projectId: schedule.projectId,
    id: schedule.id,
  });
  await expect.poll(() => received.length).toBe(1);
  await waitForAcpSessionIdle(host, schedule.sessionId);

  expect(await listed()).toMatchObject([
    { sessionId: schedule.sessionId, status: 'unread' },
  ]);
  await expect
    .poll(async () => (await counts.next()).value)
    .toMatchObject({ attention: 1 });
}, 30_000);
