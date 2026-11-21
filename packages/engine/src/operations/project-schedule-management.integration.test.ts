import { stat } from 'node:fs/promises';
import type { PromptRequest } from '@agentclientprotocol/sdk';
import { expect, it, vi } from 'vitest';
import { startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';

const projectId = 'project-1';

const instructions = 'Review the build';

const input = {
  projectId,
  agent: 'mock',
  instructions,
  cadence: { type: 'interval' as const, intervalSeconds: 60 },
};

it('preserves a scheduled Session and its Checkout when its Schedule is deleted', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ prompt: instructions }] },
  });

  const { project, session } = host.caller;
  const saved = await project.scheduleCreate(input);
  const target = { projectId, id: saved.id };
  const run = await project.scheduleRunNow(target);

  if (run.outcome !== 'started') throw new Error('Expected a Session');
  await waitForAcpSessionIdle(host, run.sessionId);

  expect((await project.scheduleHistory(target)).entries).toMatchObject([
    { occurrence: { outcome: 'started', sessionId: run.sessionId } },
  ]);
  const before = await session.get({ sessionId: run.sessionId });

  await project.scheduleManage({ ...target, action: 'delete' });
  expect(await project.scheduleList({ projectId })).toEqual([]);
  expect(await session.get({ sessionId: run.sessionId })).toMatchObject({
    checkout: before.checkout,
    archivedAt: null,
  });
  expect((await stat(before.checkout.path)).isDirectory()).toBe(true);
}, 30000);

it('edits, pauses and resumes a Project Schedule without changing its earlier Session', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/prompt': [{ prompt: instructions }] },
  });

  const { project } = host.caller;
  const saved = await project.scheduleCreate(input);
  const target = { projectId, id: saved.id };
  const launched = await project.scheduleRunNow(target);

  if (launched.outcome !== 'started') throw new Error('Expected a Session');

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
    latestSessionId: launched.sessionId,
  });

  await project.scheduleManage({ ...target, action: 'resume' });
  expect(await project.scheduleList({ projectId })).toMatchObject([
    { id: saved.id, paused: false, nextAt: saved.nextAt },
  ]);
}, 30000);

it('records the offline occurrence and starts no backlog after restart', async () => {
  const host = await startAcpEngine();

  const saved = await host.caller.project.scheduleCreate({
    ...input,
    cadence: { type: 'interval', intervalSeconds: 2 },
  });

  await host.stop();
  await vi.waitFor(() => expect(Date.now()).toBeGreaterThan(saved.nextAt), {
    timeout: 5000,
  });

  const requests: PromptRequest[] = [];

  const reopened = await startAcpEngine({
    steps: [],
    restartOver: host.home,
    responses: { 'session/prompt': [{ prompt: instructions, requests }] },
  });

  const { project } = reopened.caller;
  const target = { projectId, id: saved.id };
  await expect
    .poll(async () => (await project.scheduleHistory(target)).entries)
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          occurrence: expect.objectContaining({
            at: saved.nextAt,
            outcome: 'skipped',
            reason: expect.stringContaining('offline'),
          }),
        }),
      ]),
    );
  const [next] = await project.scheduleList({ projectId });
  expect(next?.nextAt).toBeGreaterThan(saved.nextAt);

  await expect.poll(() => requests.length, { timeout: 5000 }).toBe(1);
  const { entries } = await project.scheduleHistory(target);

  const atMissedDeadline = entries.filter(
    ({ occurrence }) => occurrence.at === saved.nextAt,
  );

  expect(atMissedDeadline).toHaveLength(1);
  expect(atMissedDeadline[0]?.occurrence.outcome).toBe('skipped');
}, 30000);
