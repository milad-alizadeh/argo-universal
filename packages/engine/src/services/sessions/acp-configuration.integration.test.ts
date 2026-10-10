import type {
  NewSessionRequest,
  PromptRequest,
  SetSessionConfigOptionRequest,
  SessionConfigOption,
} from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const configuredSessionId = 'configured-session';

it.each(agentAdapters.map(({ agent }) => agent))(
  '%s names an empty Session from its first prompt and keeps that title on later prompts',
  async (agent) => {
    const host = await startAcpEngine({ steps: [] }, undefined, agent);
    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });
    await host.caller.session.prompt({
      ...created,
      prompt: [
        { type: 'text', text: '  \n Check the live list \nFull prompt' },
      ],
    });
    await expect
      .poll(
        async () =>
          (await host.caller.session.list({ archived: false })).sessions[0],
      )
      .toMatchObject({
        title: 'Check the live list',
        titleSource: 'prompt',
        status: 'unread',
      });
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'A later prompt' }],
    });
    expect(
      (await host.caller.session.list({ archived: false })).sessions[0]?.title,
    ).toBe('Check the live list');
  },
);

it('an empty Session shows configuration returned for its actual Checkout before any prompt', async () => {
  const openings: NewSessionRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        {
          requests: openings,
          result: {
            sessionId: configuredSessionId,
            configOptions: acpConfiguration.map((option) => ({
              ...option,
              description: 'Checkout configuration',
            })),
          },
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const feed = (await host.caller.feed.subscribe({ ...created, after: null }))[
    Symbol.asyncIterator
  ]();
  const update = await feed.next();
  expect(update.value).toMatchObject({
    type: 'snapshot',
    snapshot: {
      activeTurnId: null,
      configOptions: [
        {
          configId: 'model',
          currentValue: 'large',
          description: expect.any(String),
        },
        { configId: 'effort', currentValue: 'high' },
        { configId: 'mode', currentValue: 'code' },
        { configId: 'fast', currentValue: false },
      ],
    },
  });
  expect(openings[0]?.cwd).toBe(
    (await host.caller.session.list({ archived: false })).sessions.find(
      (session) => session.sessionId === created.sessionId,
    )?.cwd,
  );
  await feed.return?.();
});

it.each(agentAdapters.map(({ agent }) => agent))(
  '%s applies Fast mode to the actual Session and reports its authoritative response',
  async (agent) => {
    const requests: SetSessionConfigOptionRequest[] = [];
    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            {
              requests,
              result: {
                configOptions: acpConfiguration.map((option) =>
                  option.id === 'fast' && option.type === 'boolean'
                    ? { ...option, currentValue: true }
                    : option,
                ),
              },
            },
          ],
        },
      },
      undefined,
      agent,
    );
    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });
    const applied = await host.caller.session.setConfigOption({
      ...created,
      configId: 'fast',
      type: 'boolean',
      value: true,
    });
    expect(requests).toEqual([
      {
        sessionId: configuredSessionId,
        configId: 'fast',
        type: 'boolean',
        value: true,
      },
    ]);
    expect(applied.configOptions).toContainEqual({
      configId: 'fast',
      name: 'Fast mode',
      category: 'model_config',
      type: 'boolean',
      currentValue: true,
    });
  },
);

it('a subsequent prompt waits for authoritative configuration while another Session can prompt', async () => {
  const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
  const finish = Promise.withResolvers<void>();
  const prompts: PromptRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [
        {
          received: started,
          waitFor: finish.promise,
          result: { configOptions: acpConfiguration },
        },
      ],
      'session/prompt': [{ requests: prompts }],
    },
  });
  const first = await host.caller.session.new(emptySessionInput);
  const sibling = await host.caller.session.new(emptySessionInput);
  const applied = host.caller.session.setConfigOption({
    ...first,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  await started.promise;
  const prompt = host.caller.session.prompt({
    ...first,
    prompt: [{ type: 'text', text: 'first' }],
  });
  await host.caller.session.prompt({
    ...sibling,
    prompt: [{ type: 'text', text: 'sibling' }],
  });
  await expect
    .poll(() => prompts.map((request) => request.prompt))
    .toEqual([[{ type: 'text', text: 'sibling' }]]);
  finish.resolve();
  await applied;
  await prompt;
  await expect
    .poll(() => prompts.map((request) => request.prompt))
    .toEqual([
      [{ type: 'text', text: 'sibling' }],
      [{ type: 'text', text: 'first' }],
    ]);
});

it('the full returned configuration replaces guessed model-dependent choices', async () => {
  const returned: SessionConfigOption[] = [
    {
      id: 'model',
      name: 'Model',
      category: 'model',
      type: 'select',
      currentValue: 'small',
      options: [{ value: 'small', name: 'Small' }],
    },
    {
      id: 'effort',
      name: 'Effort',
      category: 'thought_level',
      type: 'select',
      currentValue: 'low',
      options: [{ value: 'low', name: 'Low' }],
    },
  ];
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
    responses: {
      'session/set_config_option': [{ result: { configOptions: returned } }],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const applied = await host.caller.session.setConfigOption({
    ...created,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  expect(applied.configOptions).toEqual([
    {
      configId: 'model',
      name: 'Model',
      category: 'model',
      type: 'select',
      currentValue: 'small',
      options: [{ value: 'small', name: 'Small' }],
    },
    {
      configId: 'effort',
      name: 'Effort',
      category: 'thought_level',
      type: 'select',
      currentValue: 'low',
      options: [{ value: 'low', name: 'Low' }],
    },
  ]);
});

it('an upstream configuration rejection leaves the Session actual values unchanged', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
    responses: {
      'session/set_config_option': [
        { error: { code: -32602, message: 'Model unavailable' } },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await expect(
    host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    }),
  ).rejects.toThrow('Model unavailable');
  const feed = (await host.caller.feed.subscribe({ ...created, after: null }))[
    Symbol.asyncIterator
  ]();
  expect((await feed.next()).value).toMatchObject({
    type: 'snapshot',
    snapshot: {
      configOptions: [
        { configId: 'model', currentValue: 'large' },
        {},
        {},
        { configId: 'fast', currentValue: false },
      ],
    },
  });
  await feed.return?.();
});

it('cancellation bypasses configuration held behind an active prompt', async () => {
  const prompted = Promise.withResolvers<PromptRequest>();
  const commands: { sessionId: string }[] = [];
  const host = await startAcpEngine({
    steps: [{ type: 'wait-for-cancel' }],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
    responses: {
      'session/prompt': [
        {
          requests: commands,
          received: prompted,
          steps: [{ type: 'wait-for-cancel' }],
          result: { stopReason: 'cancelled' },
        },
      ],
      'session/set_config_option': [{ requests: commands }],
    },
    notifications: { 'session/cancel': { requests: commands } },
  });
  const created = await host.caller.session.new(emptySessionInput);
  await host.caller.session.prompt({
    ...created,
    prompt: [{ type: 'text', text: 'Wait for cancellation' }],
  });
  await prompted.promise;
  const setting = host.caller.session.setConfigOption({
    ...created,
    configId: 'mode',
    type: 'id',
    value: 'plan',
  });
  await host.caller.session.cancel(created);
  await setting;
  expect(commands).toMatchObject([
    { prompt: [{ text: 'Wait for cancellation' }] },
    { sessionId: configuredSessionId },
    { configId: 'mode' },
  ]);
});

it('initial settings finish before prompted creation dispatches any Agent work', async () => {
  const commands: { sessionId: string }[] = [];
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
    responses: {
      'session/set_config_option': [{ requests: commands }],
      'session/prompt': [{ requests: commands }],
    },
  });
  await host.caller.session.new({
    ...emptySessionInput,
    configOptions: [{ configId: 'mode', value: 'plan' }],
    prompt: [{ type: 'text', text: 'Plan first' }],
  });
  await expect
    .poll(() => commands)
    .toMatchObject([
      { configId: 'mode' },
      { prompt: [{ text: 'Plan first' }] },
    ]);
});

it('explicit closure rejects a pending configuration instead of reporting false success', async () => {
  const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
  const completion = Promise.withResolvers<void>();
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
    responses: {
      'session/set_config_option': [
        { received: started, waitFor: completion.promise },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const setting = host.caller.session.setConfigOption({
    ...created,
    configId: 'mode',
    type: 'id',
    value: 'plan',
  });
  const rejection = setting.catch((error: unknown): unknown => error);
  await started.promise;
  await host.caller.session.close(created);
  completion.resolve();
  expect(await rejection).toMatchObject({
    message: 'Session closed before configuration completed',
  });
});

it.each(
  agentAdapters.flatMap(({ agent }) => [
    { agent, configId: 'model', value: 'small' },
    { agent, configId: 'effort', value: 'low' },
    { agent, configId: 'mode', value: 'plan' },
  ]),
)(
  '$agent applies the offered $configId choice without changing a sibling Session',
  async ({ agent, configId, value }) => {
    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        responses: {
          'session/set_config_option': [
            {
              result: {
                configOptions: acpConfiguration.map((option) =>
                  option.type === 'select' && option.id === configId
                    ? { ...option, currentValue: value }
                    : option,
                ),
              },
            },
          ],
        },
      },
      undefined,
      agent,
    );
    const first = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });
    const sibling = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });
    const applied = await host.caller.session.setConfigOption({
      ...first,
      configId,
      type: 'id',
      value,
    });
    expect(
      applied.configOptions.find((option) => option.configId === configId)
        ?.currentValue,
    ).toBe(value);
    const feed = (
      await host.caller.feed.subscribe({ ...sibling, after: null })
    )[Symbol.asyncIterator]();
    expect((await feed.next()).value).toMatchObject({
      type: 'snapshot',
      snapshot: {
        configOptions: [
          { configId: 'model', currentValue: 'large' },
          { configId: 'effort', currentValue: 'high' },
          { configId: 'mode', currentValue: 'code' },
          { configId: 'fast', currentValue: false },
        ],
      },
    });
    await feed.return?.();
  },
);

it('a queued choice is rechecked after a model removes its offered option', async () => {
  const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
  const finish = Promise.withResolvers<void>();
  const requests: SetSessionConfigOptionRequest[] = [];
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
    responses: {
      'session/set_config_option': [
        {
          requests,
          received: started,
          waitFor: finish.promise,
          result: {
            configOptions: acpConfiguration.filter(
              (option) => option.id !== 'effort',
            ),
          },
        },
      ],
    },
  });
  const created = await host.caller.session.new(emptySessionInput);
  const model = host.caller.session.setConfigOption({
    ...created,
    configId: 'model',
    type: 'id',
    value: 'small',
  });
  await started.promise;
  const effort = host.caller.session.setConfigOption({
    ...created,
    configId: 'effort',
    type: 'id',
    value: 'low',
  });
  const rejected = effort.catch((error: unknown): unknown => error);
  finish.resolve();
  await model;
  expect(await rejected).toMatchObject({
    message: expect.stringContaining('effort'),
  });
  expect(requests.map((request) => request.configId)).toEqual(['model']);
});

it('the lifetime subscription applies authoritative configuration updates to the actual Session', async () => {
  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    sessionIds: [configuredSessionId],
  });
  const created = await host.caller.session.new(emptySessionInput);
  const updated: SessionConfigOption[] = [
    {
      id: 'fast-mode',
      name: 'Fast mode',
      category: 'model_config',
      type: 'select',
      currentValue: 'on',
      options: [
        {
          group: 'speed',
          name: 'Speed',
          options: [
            { value: 'on', name: 'On', description: null, _meta: null },
            { value: 'off', name: 'Off' },
          ],
        },
      ],
      description: null,
      _meta: null,
    },
  ];
  await requireScriptedProcessAt(host.agent.processes).play(
    [
      {
        type: 'update',
        update: {
          sessionUpdate: 'config_option_update',
          configOptions: updated,
        },
      },
    ],
    configuredSessionId,
  );
  const feed = (await host.caller.feed.subscribe({ ...created, after: null }))[
    Symbol.asyncIterator
  ]();
  const expected = [
    {
      configId: 'fast-mode',
      name: 'Fast mode',
      category: 'model_config',
      type: 'select',
      currentValue: 'on',
      options: [
        {
          groupId: 'speed',
          name: 'Speed',
          options: [
            { value: 'on', name: 'On' },
            { value: 'off', name: 'Off' },
          ],
        },
      ],
    },
  ];
  await expect
    .poll(async () => (await feed.next()).value)
    .toMatchObject({ type: 'snapshot', snapshot: { configOptions: expected } });
  await feed.return?.();
});

it('malformed Argo configuration metadata is reported, counted and closes the failed opening', async () => {
  const report = vi.spyOn(console, 'error').mockImplementation(() => {});
  const closed: { sessionId: string }[] = [];
  try {
    const host = await startAcpEngine({
      steps: [],
      responses: {
        'session/new': [
          {
            result: {
              sessionId: configuredSessionId,
              configOptions: [
                {
                  id: 'fast',
                  name: 'Fast mode',
                  type: 'boolean',
                  currentValue: false,
                  _meta: { argo: { tone: 'invented' } },
                },
              ],
            },
          },
        ],
        'session/close': [{ requests: closed }],
      },
    });
    await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
      'tone',
    );
    await expect
      .poll(() => closed)
      .toEqual([{ sessionId: configuredSessionId }]);
    expect(report).toHaveBeenCalledWith(
      expect.stringMatching(/Rejected Session configuration metadata #1/),
      expect.any(Error),
    );
  } finally {
    report.mockRestore();
  }
});
