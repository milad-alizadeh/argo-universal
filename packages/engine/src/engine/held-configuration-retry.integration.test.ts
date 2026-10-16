import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { heldRecoveryScenario } from '#mocks/held-configuration-recovery';

it.each(appFixtureAgentIds)(
  '%s retains failed and unattempted held choices until a successful retry',
  async (agent) => {
    const { scenario, finish, prompted, commands } = heldRecoveryScenario(true);
    const host = await startAcpEngine(scenario, undefined, agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await prompted.promise;
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'mode',
      type: 'id',
      value: 'plan',
    });
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'fast',
      type: 'boolean',
      value: true,
    });
    finish.resolve();
    await waitForAcpSessionIdle(host, created.sessionId);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Next' }],
      }),
    ).rejects.toThrow('Configuration temporarily unavailable');

    const failed = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.state === 'idle',
    );

    expect(
      failed.configOptions
        .filter((option) => option._meta?.argo?.heldUntilNextTurn)
        .map((option) => option.currentValue),
    ).toEqual(['plan', true]);
    expect(commands).toHaveLength(2);
    expect(
      host.database.$client
        .prepare('SELECT status FROM turn WHERE session_id = ?')
        .all(created.sessionId),
    ).toEqual([{ status: 'ended' }]);

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Retry' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(commands).toEqual([
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'First' }] },
      { sessionId: 'owned-1', configId: 'mode', value: 'plan' },
      { sessionId: 'owned-1', configId: 'mode', value: 'plan' },
      { sessionId: 'owned-1', configId: 'fast', type: 'boolean', value: true },
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'Retry' }] },
    ]);

    const applied = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.state === 'idle',
    );

    expect(
      applied.configOptions.some(
        (option) => option._meta?.argo?.heldUntilNextTurn,
      ),
    ).toBe(false);
    await expect
      .poll(() =>
        host.database.$client
          .prepare('SELECT held_config FROM session WHERE id = ?')
          .get(created.sessionId),
      )
      .toEqual({ held_config: '[]' });
  },
);
