import type { NewSessionRequest } from '@agentclientprotocol/sdk';
import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';
import { operationCaller } from '#mocks/operations';

it('caps an unstored ACP opening, then resumes its one actual first Prompt', async () => {
  const clock = new TestOperationWaitClock();
  const opening = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();
  onTestFinished(() => release.resolve());

  const host = await startAcpEngine({
    operationWaitClock: clock,
    steps: [],
    responses: {
      'session/new': [{ received: opening, waitFor: release.promise }],
    },
  });

  const user = await operationCaller(host);

  const run = user.operations.run.mutate({
    id: 'session.new',
    params: {
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'After opening' }],
    },
    wait: true,
  });

  await opening.promise;
  await clock.waitUntilScheduled();
  clock.advance(90_000);
  const pending = OperationExecution.parse(await run);
  expect(pending).toMatchObject({
    status: 'still_running',
    id: expect.stringMatching(/^creation:/),
  });
  const created = SessionNewOutput.parse(pending.result);
  expect((await host.caller.session.list({})).sessions).not.toContainEqual(
    expect.objectContaining(created),
  );
  release.resolve();
  const settled = await user.operations.wait.mutate({ id: pending.id });
  expect(settled).toMatchObject({
    status: 'settled',
    turn: { stopReason: 'end_turn' },
  });
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(1);
  expect(clock.activeDeadlines()).toBe(0);
}, 30_000);
