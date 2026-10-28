import { OperationExecution } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { holdProjectReads } from '#mocks/git-read-gate';
import { operationRaceHost, beginHeldTurn } from '#mocks/operation-race';
import { TestOperationWaitClock } from '#mocks/operation-wait-clock';

it('returns cancelled native work within the cap even if its underlying read has not returned', async () => {
  const clock = new TestOperationWaitClock();
  const { host, session } = await operationRaceHost(clock);
  await beginHeldTurn(host, session.sessionId);
  const gate = await holdProjectReads(host.home);

  const running = session.caller.operations.run.mutate({
    id: 'project.list',
    params: {},
    wait: true,
  });

  await gate.started();
  await host.caller.session.cancel({ sessionId: session.sessionId });
  clock.advance(90_000);

  try {
    expect(OperationExecution.parse(await running)).toMatchObject({
      status: 'settled',
      cancelled: true,
    });
  } finally {
    await gate.release();
  }
}, 30_000);
