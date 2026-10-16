import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { appFixtureAgentIds } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { heldRecoveryScenario } from '#mocks/held-configuration-recovery';

const afterModel = acpConfiguration
  .filter((option) => option.id !== 'effort')
  .map((option) =>
    option.id === 'model' && option.type === 'select'
      ? { ...option, currentValue: 'small' }
      : option,
  );

it.each(appFixtureAgentIds)(
  '%s reports an invalidated held choice once and permits the next Send with authoritative options',
  async (agent) => {
    const { scenario, finish, prompted, commands } = heldRecoveryScenario();

    const host = await startAcpEngine(
      {
        ...scenario,
        responses: {
          ...scenario.responses,
          'session/set_config_option': [
            { requests: commands, result: { configOptions: afterModel } },
          ],
        },
      },
      undefined,
      agent,
    );

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await prompted.promise;
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'effort',
      type: 'id',
      value: 'low',
    });
    finish.resolve();
    await waitForAcpSessionIdle(host, created.sessionId);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Next' }],
      }),
    ).rejects.toThrow('effort=low');
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Retry' }],
    });
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(commands).toEqual([
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'First' }] },
      { sessionId: 'owned-1', configId: 'model', value: 'small' },
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'Retry' }] },
    ]);
    await expect
      .poll(() =>
        host.database.$client
          .prepare('SELECT held_config FROM session WHERE id = ?')
          .get(created.sessionId),
      )
      .toEqual({ held_config: '[]' });
  },
);
