import { SessionNewOutput } from '@repo/contracts';
import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { startEngineTestHost } from '#mocks/engine';
import { recordingSource, writeHookPlugins } from '#mocks/hook-plugins';
import { openingWaitHost } from '#mocks/operation-opening';
import { operationCaller } from '#mocks/operations';

const startOperation = 'session.new';

it('settles empty and Hook-dropped first Prompts without inventing a Turn', async () => {
  const host = await startAcpEngine({
    steps: [],
    installPlugins: (home) =>
      writeHookPlugins(home, [
        {
          id: 'drop-prompts',
          hooks: ['prompt.submit'],
          source: recordingSource(
            "await on('prompt.submit', () => ({ drop: 'No work needed' }));",
          ),
        },
      ]),
  });

  const user = await operationCaller(host);

  for (const prompt of [
    [],
    [{ type: 'text' as const, text: 'Drop this first Prompt' }],
  ]) {
    const result = OperationExecution.parse(
      await user.operations.run.mutate({
        id: startOperation,
        params: { ...emptySessionInput, prompt },
        wait: true,
      }),
    );

    expect(result.status).toBe('settled');
    expect(result.turn).toBeUndefined();
    const created = SessionNewOutput.parse(result.result);
    expect((await host.caller.session.get(created)).activeTurnId).toBeNull();
    expect(
      (await host.caller.feed.page({ ...created, direction: 'tail' })).rows,
    ).toEqual([]);
  }
}, 30_000);

it('reports a failed opening without persisting a Session or claiming completion', async () => {
  const host = await openingWaitHost({
    failure: 'The Agent refused the Session.',
  });

  const started = OperationExecution.parse(
    await host.user.operations.run.mutate({
      id: startOperation,
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Refused opening' }],
      },
    }),
  );

  const created = SessionNewOutput.parse(started.result);
  await host.opening;
  host.release.resolve();
  await expect(
    host.user.operations.wait.mutate({ id: started.id }),
  ).rejects.toMatchObject({ data: { code: 'NOT_FOUND' } });
  await expect(host.caller.session.get(created)).rejects.toMatchObject({
    code: 'NOT_FOUND',
  });
  expect((await host.caller.session.list({})).sessions).not.toContainEqual(
    expect.objectContaining(created),
  );
}, 30_000);

it('retains exact stored Turn waits across restart and expires old Engine opening handles', async () => {
  const host = await openingWaitHost();

  const started = OperationExecution.parse(
    await host.user.operations.run.mutate({
      id: startOperation,
      params: {
        ...emptySessionInput,
        prompt: [{ type: 'text', text: 'Durable native Turn' }],
      },
    }),
  );

  await host.opening;
  host.release.resolve();
  const settled = await host.user.operations.wait.mutate({ id: started.id });
  expect(settled).toMatchObject({
    status: 'settled',
    turn: { stopReason: 'end_turn' },
  });
  await host.stop();

  const restored = await startEngineTestHost({
    home: host.home,
    acp: host.agent,
  });

  try {
    const user = await operationCaller(restored);
    await expect(
      user.operations.wait.mutate({ id: started.id }),
    ).rejects.toMatchObject({
      message: 'This Session opening belongs to a previous Engine',
      data: { code: 'NOT_FOUND' },
    });
    expect(await user.operations.wait.mutate({ id: settled.id })).toMatchObject(
      {
        status: 'settled',
        turn: { id: settled.turn?.id, stopReason: 'end_turn' },
      },
    );
    expect(host.agent.processes).toHaveLength(1);
  } finally {
    await restored.stop();
  }
}, 30_000);
