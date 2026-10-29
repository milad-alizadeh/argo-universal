import { OperationExecution } from '@repo/contracts/operations';
import { expect, it, onTestFinished } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSnapshot } from '#mocks/acp-feed';
import { operationCaller, runOperation } from '#mocks/operations';

it.each(['end_turn', 'cancelled'] as const)(
  'returns the exact terminal Prompt Turn and resumes its %s outcome',
  async (stopReason) => {
    const release = Promise.withResolvers<void>();
    onTestFinished(() => release.resolve());

    const host = await startAcpEngine({
      steps: [{ type: 'wait-for-cancel', until: release.promise }],
    });

    const created = await host.caller.session.new(emptySessionInput);
    const user = await operationCaller(host);

    const pending = OperationExecution.parse(
      await runOperation(user.operations, {
        id: 'session.prompt',
        params: {
          ...created,
          prompt: [{ type: 'text', text: 'Terminal Prompt' }],
        },
      }),
    );

    expect(pending).toMatchObject({
      status: 'still_running',
      turn: { sessionId: created.sessionId, status: 'running' },
    });

    const active = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) => value.activeTurnId !== null,
    );

    expect(pending.turn?.id).toBe(active.activeTurnId);

    if (stopReason === 'cancelled') await host.caller.session.cancel(created);
    else release.resolve();

    expect(await user.operations.wait.mutate({ id: pending.id })).toMatchObject(
      {
        status: 'settled',
        turn: { id: active.activeTurnId, stopReason },
      },
    );
    expect(
      (
        await host.caller.feed.page({ ...created, direction: 'tail' })
      ).rows.filter((row) => row.sessionUpdate === 'user_message'),
    ).toHaveLength(1);
  },
  30_000,
);
