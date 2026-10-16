import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { heldConfigurationScenario } from '#mocks/held-configuration';

it.each(appFixtureAgentIds)(
  '%s acknowledges held choices immediately and applies only the latest values before the next prompt',
  async (agent) => {
    const { scenario, finishTurn, applying, finishConfig, prompted, commands } =
      heldConfigurationScenario();

    const host = await startAcpEngine(scenario, undefined, agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'First' }],
    });
    await prompted.promise;

    for (const value of ['plan', 'code', 'plan']) {
      const held = await host.caller.session.setConfigOption({
        ...created,
        configId: 'mode',
        type: 'id',
        value,
      });

      expect(held.configOptions).toContainEqual(
        expect.objectContaining({
          configId: 'mode',
          currentValue: value,
          _meta: { argo: { heldUntilNextTurn: true } },
        }),
      );
    }

    await host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'fast',
      type: 'boolean',
      value: true,
    });

    const held = await waitForAcpSnapshot(host, created.sessionId, (snapshot) =>
      snapshot.configOptions.some(
        (option) => option.configId === 'fast' && option.currentValue === true,
      ),
    );

    expect(held.state).toBe('running');
    expect(
      held.configOptions
        .filter((option) => option._meta?.argo?.heldUntilNextTurn)
        .map((option) => option.currentValue),
    ).toEqual(['small', 'plan', true]);
    expect(commands).toHaveLength(1);

    finishTurn.resolve();
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(commands).toHaveLength(1);

    const next = host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Next' }],
    });

    await applying.promise;
    expect(commands).toMatchObject([
      { prompt: [{ text: 'First' }] },
      { configId: 'mode', value: 'plan' },
    ]);
    finishConfig.resolve();
    await next;
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(commands).toEqual([
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'First' }] },
      { sessionId: 'owned-1', configId: 'mode', value: 'plan' },
      { sessionId: 'owned-1', configId: 'model', value: 'small' },
      { sessionId: 'owned-1', configId: 'fast', type: 'boolean', value: true },
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'Next' }] },
    ]);

    const applied = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (snapshot) => snapshot.state === 'idle',
    );

    expect(applied.configOptions).toMatchObject([
      { configId: 'model', currentValue: 'small' },
      {},
      { configId: 'mode', currentValue: 'plan' },
      { configId: 'fast', currentValue: true },
    ]);
    expect(
      applied.configOptions.some(
        (option) => option._meta?.argo?.heldUntilNextTurn,
      ),
    ).toBe(false);
    expect(
      host.database.$client
        .prepare(
          'SELECT model FROM turn WHERE session_id = ? ORDER BY started_at',
        )
        .all(created.sessionId),
    ).toEqual([{ model: 'large' }, { model: 'small' }]);
  },
);
