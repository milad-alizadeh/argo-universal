import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { configuration, recoverSession } from './restore.test.mocks';

it.each(
  fixtureAgents.flatMap((identity) =>
    ['close', 'exit', 'restart'].map((recovery) => ({ identity, recovery })),
  ),
)(
  '$identity.agent restores selected model, effort and mode after $recovery',
  async ({ identity, recovery }) => {
    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: configuration,
      },
      undefined,
      identity.agent,
    );

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent: identity.agent,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await waitForAcpSessionIdle(host, created.sessionId);

    for (const [configId, value] of [
      ['model', 'small'],
      ['effort', 'low'],
      ['mode', 'read-only'],
    ] as const)
      await host.caller.session.setConfigOption({
        ...created,
        configId,
        type: 'id',
        value,
      });

    const expected = [
      { configId: 'model', currentValue: 'small' },
      { configId: 'effort', currentValue: 'low' },
      { configId: 'mode', currentValue: 'read-only' },
      { configId: 'fast', currentValue: false },
    ];

    expect(
      (await host.caller.session.get(created)).configOptions,
    ).toMatchObject(expected);

    const restored = await recoverSession(host, {
      identity,
      kind: recovery,
      sessionId: created.sessionId,
    });

    await restored.caller.session.open(created);
    expect(
      (await restored.caller.session.get(created)).configOptions,
    ).toMatchObject(expected);
    await restored.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Next' }],
    });
    await waitForAcpSessionIdle(restored, created.sessionId);
    expect(
      (await restored.caller.session.get(created)).configOptions,
    ).toMatchObject(expected);
  },
);
