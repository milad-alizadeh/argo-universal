import { OperationExecution } from '@repo/contracts/operations';
import type { Json } from '@repo/contracts/plugins/hook-protocol';
import { expect, it } from 'vitest';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { openingWaitHost } from '#mocks/operation-opening';
import { runOperation } from '#mocks/operations';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const opening = (text: string): Json => ({
  ...emptySessionInput,
  prompt: [{ type: 'text', text }],
});

it('detaches a disconnected run --wait without cancelling the Session opening', async () => {
  const host = await openingWaitHost();
  const abort = new AbortController();

  const run = Promise.allSettled([
    runOperation(
      host.user.operations,
      { id: 'session.new', params: opening('Detached opening'), wait: true },
      { signal: abort.signal },
    ),
  ]);

  await host.opening;
  await host.clock.waitUntilScheduled();
  abort.abort();
  expect(await run).toMatchObject([{ status: 'rejected' }]);
  await expect.poll(() => host.clock.activeDeadlines()).toBe(0);
  host.release.resolve();

  const listed = async (): Promise<string | undefined> =>
    (await host.caller.session.list({})).sessions.find(
      (value) => value.title === 'Detached opening',
    )?.sessionId;

  await expect.poll(listed).toEqual(expect.any(String));
  const sessionId = String(await listed());
  await waitForAcpSessionIdle(host, sessionId);
  const page = await host.caller.feed.page({ sessionId, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toHaveLength(1);
  expect(requireScriptedProcessAt(host.agent.processes).terminations).toBe(0);
}, 30_000);

it('resumes a Session opening wait id after a disconnected wait', async () => {
  const host = await openingWaitHost();

  const started = OperationExecution.parse(
    await runOperation(host.user.operations, {
      id: 'session.new',
      params: opening('Resumed opening'),
    }),
  );

  await host.opening;
  const abort = new AbortController();

  const waiting = Promise.allSettled([
    host.user.operations.wait.mutate(
      { id: started.id },
      { signal: abort.signal },
    ),
  ]);

  await host.clock.waitUntilScheduled();
  abort.abort();
  expect(await waiting).toMatchObject([{ status: 'rejected' }]);
  await expect.poll(() => host.clock.activeDeadlines()).toBe(0);
  host.release.resolve();
  expect(
    await host.user.operations.wait.mutate({ id: started.id }),
  ).toMatchObject({ status: 'settled', turn: { stopReason: 'end_turn' } });
  expect(host.clock.activeDeadlines()).toBe(0);
}, 30_000);
