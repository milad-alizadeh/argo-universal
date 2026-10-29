import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { emptySessionInput } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { openingWaitHost } from '#mocks/operation-opening';
import { operationCaller, runOperation } from '#mocks/operations';

const storedPrompt = 'Stored before reopening';

it('refuses Session-token calls before the new Session can store Tool rows, then admits them after opening', async () => {
  const host = await openingWaitHost();
  const { opening, release, environment, user } = host;

  const started = OperationExecution.parse(
    await runOperation(user.operations, {
      id: 'session.new',
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Open before access' }],
      },
    }),
  );

  await opening;

  const caller = await operationCaller(
    host,
    z.string().parse((await environment).ARGO_TOKEN),
  );

  const outcome = await caller.operations.list.query().then(
    () => ({ message: 'accepted' }),
    (error) =>
      z
        .object({ message: z.string(), data: z.object({ code: z.string() }) })
        .parse(error),
  );

  expect(outcome).toMatchObject({
    message: 'The calling Session is still opening',
    data: { code: 'CONFLICT' },
  });
  release.resolve();
  expect(await user.operations.wait.mutate({ id: started.id })).toMatchObject({
    status: 'settled',
    turn: { stopReason: 'end_turn' },
  });
  expect(await caller.operations.list.query()).toEqual(expect.any(Array));
}, 30_000);

it('admits discovery while a stored Session reopens, but expires an unadmitted Prompt without submitting it late', async () => {
  const host = await openingWaitHost({ resume: true });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: storedPrompt }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  expect(await host.caller.session.get(created)).toMatchObject({
    title: storedPrompt,
    state: 'idle',
  });
  await host.caller.session.close(created);

  const pending = Promise.allSettled([
    runOperation(host.user.operations, {
      id: 'session.prompt',
      params: {
        ...created,
        prompt: [{ type: 'text', text: 'Never admitted on resume' }],
      },
      wait: true,
    }),
  ]);

  await host.opening;

  const caller = await operationCaller(
    host,
    z.string().parse(host.environments.at(-1)?.ARGO_TOKEN),
  );

  expect(await caller.operations.list.query()).toEqual(expect.any(Array));
  host.clock.advance(90_000);
  expect(await pending).toMatchObject([
    { status: 'rejected', reason: { data: { code: 'TIMEOUT' } } },
  ]);
  host.release.resolve();
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Control after resume' }],
  });
  const page = await host.caller.feed.page({ ...created, direction: 'tail' });
  expect(
    page.rows.filter((row) => row.sessionUpdate === 'user_message'),
  ).toMatchObject([
    { content: [{ type: 'text', text: storedPrompt }] },
    { content: [{ type: 'text', text: 'Control after resume' }] },
  ]);
  expect(host.clock.activeDeadlines()).toBe(0);
}, 30_000);
