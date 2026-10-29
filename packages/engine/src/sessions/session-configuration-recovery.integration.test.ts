import type {
  PromptRequest,
  SessionConfigOption,
  SetSessionConfigOptionRequest,
} from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle } from '#mocks/acp-feed';
import { startEngineTestHost } from '#mocks/engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const configuration: SessionConfigOption[] = acpConfiguration.map((option) =>
  option.id === 'mode' && option.type === 'select'
    ? {
        ...option,
        options: [
          { value: 'code', name: 'Code' },
          { value: 'read-only', name: 'Read-only' },
        ],
      }
    : option,
);

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
    let restored = host;

    if (recovery === 'restart') {
      await host.stop();
      restored = {
        ...host,
        ...(await startEngineTestHost({
          home: host.home,
          acp: host.agent,
          fixtureAgents: [identity],
        })),
      };
    } else if (recovery === 'exit') {
      const events = await host.caller.feed.subscribe({
        ...created,
        after: null,
      });

      const process = requireScriptedProcessAt(host.agent.processes);
      process.exited.resolve();
      process.connection.close();

      for await (const event of events) if (event.type === 'closed') break;
    } else {
      await host.caller.session.close(created);
    }

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

it('restores model-dependent choices in model, effort, mode order before the follow-up', async () => {
  const requests: SetSessionConfigOptionRequest[] = [];
  const initial = [...configuration].reverse();

  const afterModel = initial.map((option) =>
    option.id === 'model' && option.type === 'select'
      ? { ...option, currentValue: 'small' }
      : option,
  );

  const afterEffort = afterModel.map((option) =>
    option.id === 'effort' && option.type === 'select'
      ? { ...option, currentValue: 'low' }
      : option,
  );

  const selected = afterEffort.map((option) =>
    option.id === 'mode' && option.type === 'select'
      ? { ...option, currentValue: 'read-only' }
      : option,
  );

  const responses = [
    afterModel,
    afterEffort,
    selected,
    afterModel,
    afterEffort,
    selected,
  ].map((configOptions) => ({ requests, result: { configOptions } }));

  const host = await startAcpEngine({
    steps: [],
    configOptions: initial,
    responses: { 'session/set_config_option': responses },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
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
  await host.caller.session.close(created);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Next' }],
  });
  await waitForAcpSessionIdle(host, created.sessionId);
  expect(
    requests.slice(3).map(({ configId, value }) => ({ configId, value })),
  ).toEqual([
    { configId: 'model', value: 'small' },
    { configId: 'effort', value: 'low' },
    { configId: 'mode', value: 'read-only' },
  ]);
  expect((await host.caller.session.get(created)).configOptions).toMatchObject([
    { configId: 'fast', currentValue: false },
    { configId: 'mode', currentValue: 'read-only' },
    { configId: 'effort', currentValue: 'low' },
    { configId: 'model', currentValue: 'small' },
  ]);
});

it.each(['model', 'mode'])(
  'refuses to reopen or prompt when the selected %s is no longer offered',
  async (configId) => {
    const prompts: PromptRequest[] = [];
    const value = configId === 'model' ? 'small' : 'read-only';

    const unavailable = configuration.map((option) =>
      option.id === configId && option.type === 'select'
        ? {
            ...option,
            options: option.options
              .flatMap((choice) =>
                'value' in choice ? [choice] : choice.options,
              )
              .filter((choice) => choice.value !== value),
          }
        : option,
    );

    const host = await startAcpEngine({
      steps: [],
      configOptions: configuration,
      responses: {
        'session/prompt': [{ requests: prompts }],
        'session/resume': [
          { result: { configOptions: unavailable } },
          { result: { configOptions: unavailable } },
        ],
      },
    });

    const created = await host.caller.session.new({
      ...emptySessionInput,
      prompt: [{ type: 'text', text: 'First' }],
    });

    await waitForAcpSessionIdle(host, created.sessionId);
    await host.caller.session.setConfigOption({
      ...created,
      configId,
      type: 'id',
      value,
    });
    await host.caller.session.close(created);
    await expect(host.caller.session.open(created)).rejects.toThrow(
      `${configId}=${value}`,
    );
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Must not run' }],
      }),
    ).rejects.toThrow(`${configId}=${value}`);
    expect(prompts).toHaveLength(1);
  },
);

it('keeps selected Read-only mode when the Agent reports defaults while closing', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: configuration,
    responses: {
      'session/close': [
        {
          steps: [
            {
              type: 'update',
              update: {
                sessionUpdate: 'config_option_update',
                configOptions: configuration,
              },
            },
          ],
        },
      ],
    },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'First' }],
  });

  await waitForAcpSessionIdle(host, created.sessionId);
  await host.caller.session.setConfigOption({
    ...created,
    configId: 'mode',
    type: 'id',
    value: 'read-only',
  });
  await host.caller.session.close(created);
  await host.caller.session.open(created);
  expect((await host.caller.session.get(created)).configOptions).toContainEqual(
    expect.objectContaining({ configId: 'mode', currentValue: 'read-only' }),
  );
});
