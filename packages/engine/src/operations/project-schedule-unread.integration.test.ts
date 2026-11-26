import type { PromptRequest } from '@agentclientprotocol/sdk';
import type { SessionCounts, SessionInfo } from '@repo/contracts';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

// Every attention count the badge is drawn from, from before the Schedule exists.
async function recordAttention(host: Host): Promise<number[]> {
  const controller = new AbortController();
  onTestFinished((): void => controller.abort());

  const counts = await host
    .createCaller({ signal: controller.signal })
    .session.counts();

  const seen: number[] = [];

  void (async (): Promise<void> => {
    for await (const value of counts as AsyncIterable<SessionCounts>)
      seen.push(value.attention);
  })().catch((): void => undefined);

  await expect.poll(() => seen.length).toBeGreaterThan(0);

  return seen;
}

it('marks a task Schedule Session Unread when a run ends, never when the Schedule is saved', async (): Promise<void> => {
  const instructions = 'Review the build';
  const received: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [{ prompt: instructions, requests: received }],
    },
  });

  const { project, session } = host.caller;

  const attention = await recordAttention(host);

  const schedule = await project.scheduleCreate({
    projectId: 'project-1',
    agent: 'mock',
    instructions,
    cadence: { type: 'interval' as const, intervalSeconds: 3600 },
  });

  // Scheduled reads a task's status from its own Session, listed with the Sessions it started.
  const listed = async (): Promise<SessionInfo[]> =>
    (await session.list({ taskSessions: 'tasks' })).sessions;

  expect(await listed()).toMatchObject([
    { sessionId: schedule.sessionId, status: 'idle' },
  ]);
  expect((await session.list({ taskSessions: 'exclude' })).sessions).toEqual(
    [],
  );
  // The save never reached the badge, not even between its writes.
  expect(attention).not.toContain(1);

  await project.scheduleRunNow({
    projectId: schedule.projectId,
    id: schedule.id,
  });
  await expect.poll(() => received.length).toBe(1);
  await waitForAcpSessionIdle(host, schedule.sessionId);

  expect(await listed()).toMatchObject([
    { sessionId: schedule.sessionId, status: 'unread' },
  ]);
  await expect.poll(() => attention.at(-1)).toBe(1);

  const { maxRevision } = await session.get({ sessionId: schedule.sessionId });
  await session.markSeen({
    sessionId: schedule.sessionId,
    revision: maxRevision,
  });

  await expect.poll(() => attention.at(-1)).toBe(0);
}, 30_000);

it('marks a Session Unread when its own Schedule runs after it was seen', async (): Promise<void> => {
  const text = 'Check the build';
  const received: PromptRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { prompt: 'Start' },
        { prompt: text, requests: received },
      ],
    },
  });

  const { session } = host.caller;

  const { sessionId } = await session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Start' }],
  });

  await waitForAcpSessionIdle(host, sessionId);

  const seen = await session.get({ sessionId });
  await session.markSeen({ sessionId, revision: seen.maxRevision });

  const attention = await recordAttention(host);
  expect(attention.at(-1)).toBe(0);

  await session.schedulePrompt({
    sessionId,
    intervalSeconds: 1,
    prompt: [{ type: 'text', text }],
  });
  await expect.poll(() => received.length, { timeout: 8000 }).toBe(1);
  await waitForAcpSessionIdle(host, sessionId);

  expect(
    (await session.list({ taskSessions: 'exclude' })).sessions,
  ).toMatchObject([{ sessionId, status: 'unread' }]);
  await expect.poll(() => attention.at(-1)).toBe(1);
}, 30_000);
