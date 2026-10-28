import type { PromptRequest } from '@agentclientprotocol/sdk';
import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot, waitForAcpSessionIdle } from '#mocks/acp-feed';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';
import { operationCaller } from '#mocks/operations';

it('returns native work at once and keeps an old wait bound to its admitted Turn', async () => {
  const first = Promise.withResolvers<void>();
  const second = Promise.withResolvers<void>();
  onTestFinished(() => {
    first.resolve();
    second.resolve();
  });

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/prompt': [
        { steps: [{ type: 'wait-for-cancel', until: first.promise }] },
        { steps: [{ type: 'wait-for-cancel', until: second.promise }] },
      ],
    },
  });

  const user = await operationCaller(host);

  const started = OperationExecution.parse(
    await user.operations.run.mutate({
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'First native Turn' }],
      },
    }),
  );

  expect(started.status).toBe('still_running');
  const created = SessionNewOutput.parse(started.result);
  await expect
    .poll(async () =>
      (await host.caller.session.list({})).sessions.map(
        (value) => value.sessionId,
      ),
    )
    .toContain(created.sessionId);

  const active = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.activeTurnId !== null,
  );

  first.resolve();
  const settled = await user.operations.wait.mutate({ id: started.id });
  expect(settled).toMatchObject({
    status: 'settled',
    turn: { id: active.activeTurnId, stopReason: 'end_turn' },
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Second native Turn' }],
  });

  const later = await waitForAcpSnapshot(
    host,
    created.sessionId,
    (value) => value.activeTurnId !== null,
  );

  expect(later.activeTurnId).not.toBe(active.activeTurnId);
  expect(await user.operations.wait.mutate({ id: settled.id })).toMatchObject({
    status: 'settled',
    turn: { id: active.activeTurnId, stopReason: 'end_turn' },
  });
}, 30_000);

it('returns the exact Turn admitted by a terminal Prompt and resumes it after completion', async () => {
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());
  const host = await startAcpEngine({ steps: [{ type: 'wait-for-cancel', until: release.promise }] });
  const created = await host.caller.session.new(emptySessionInput);
  const user = await operationCaller(host);
  const pending = OperationExecution.parse(await user.operations.run.mutate({ id: 'session.prompt', params: { ...created, prompt: [{ type: 'text', text: 'Terminal Prompt' }] } }));
  expect(pending).toMatchObject({ status: 'still_running', turn: { sessionId: created.sessionId, status: 'running' } });
  const active = await waitForAcpSnapshot(host, created.sessionId, (value) => value.activeTurnId !== null);
  expect(pending.turn?.id).toBe(active.activeTurnId);
  release.resolve();
  expect(await user.operations.wait.mutate({ id: pending.id })).toMatchObject({ status: 'settled', turn: { id: active.activeTurnId, stopReason: 'end_turn' } });
  expect((await host.caller.feed.page({ ...created, direction: 'tail' })).rows.filter((row) => row.sessionUpdate === 'user_message')).toHaveLength(1);
}, 30_000);

it('caps a running exact Turn at ninety seconds and resumes without submitting another Prompt', async () => {
  const clock = new TestOperationWaitClock();
  const release = Promise.withResolvers<void>();
  const prompted = Promise.withResolvers<PromptRequest>();
  onTestFinished(() => release.resolve());

  const host = await startAcpEngine({
    operationWaitClock: clock,
    steps: [],
    responses: {
      'session/prompt': [
        {
          received: prompted,
          steps: [{ type: 'wait-for-cancel', until: release.promise }],
        },
      ],
    },
  });

  const user = await operationCaller(host);
  let answered = false;

  const run = user.operations.run
    .mutate({
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Keep this exact Turn' }],
      },
      wait: true,
    })
    .then((value) => {
      answered = true;

      return value;
    });

  await clock.waitUntilScheduled();
  await prompted.promise;

  const listed = (await host.caller.session.list({})).sessions.find(
    (value) => value.title === 'Keep this exact Turn',
  );

  if (!listed) throw new Error('The prompted Session is missing');

  const active = await waitForAcpSnapshot(
    host,
    listed.sessionId,
    (value) => value.activeTurnId !== null,
  );

  clock.advance(89_999);
  await Promise.resolve();
  expect(answered).toBe(false);
  clock.advance(1);
  const pending = OperationExecution.parse(await run);
  expect(pending.status).toBe('still_running');
  const created = SessionNewOutput.parse(pending.result);
  release.resolve();
  const settled = await user.operations.wait.mutate({ id: pending.id });
  expect(settled).toMatchObject({
    status: 'settled',
    turn: { id: active.activeTurnId, stopReason: 'end_turn' },
  });
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(1);
  expect(clock.activeDeadlines()).toBe(0);
}, 30_000);
