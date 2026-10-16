import type { FeedSubscribeOutput } from '@repo/contracts';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { heldRecoveryScenario } from '#mocks/held-configuration-recovery';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const cases = fixtureAgents.flatMap((identity) =>
  ['exit', 'restart'].map((recovery) => ({ identity, recovery })),
);

it.each(cases)(
  '$identity.agent keeps an acknowledged held mode across $recovery and applies it before the next prompt',
  async ({ identity, recovery }) => {
    const { scenario, finish, prompted, commands } = heldRecoveryScenario();
    const host = await startAcpEngine(scenario, undefined, identity.agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent: identity.agent,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await prompted.promise;
    await host.caller.session.setConfigOption({
      ...created,
      configId: 'mode',
      type: 'id',
      value: 'plan',
    });
    expect(
      host.database.$client
        .prepare('SELECT held_config FROM session WHERE id = ?')
        .get(created.sessionId),
    ).toEqual({ held_config: '[{"configId":"mode","value":"plan"}]' });

    let restored = host;

    if (recovery === 'restart') {
      finish.resolve();
      await waitForAcpSessionIdle(host, created.sessionId);
      await host.stop();
      restored = {
        ...host,
        ...(await startEngineTestHost({
          home: host.home,
          acp: host.agent,
          fixtureAgents: [identity],
        })),
      };
    } else {
      const events = await host.caller.feed.subscribe({
        ...created,
        after: null,
      });

      const process = requireScriptedProcessAt(host.agent.processes);
      process.exited.resolve();
      process.connection.close();

      await waitForClosed(events);
      finish.resolve();
    }

    await restored.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Next' }],
    });
    await waitForAcpSessionIdle(restored, created.sessionId);
    expect(commands).toEqual([
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'First' }] },
      { sessionId: 'owned-1', configId: 'mode', value: 'plan' },
      { sessionId: 'owned-1', prompt: [{ type: 'text', text: 'Next' }] },
    ]);
    await expect
      .poll(() =>
        restored.database.$client
          .prepare('SELECT held_config FROM session WHERE id = ?')
          .get(created.sessionId),
      )
      .toEqual({ held_config: '[]' });
  },
);

async function waitForClosed(
  events: AsyncIterable<FeedSubscribeOutput>,
): Promise<void> {
  for await (const event of events) if (event.type === 'closed') return;

  throw new Error('The Session Feed ended without closure');
}
