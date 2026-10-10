import { RequestError } from '@agentclientprotocol/sdk';
import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import type {
  PromptResponse,
  SessionConfigOption,
  SetSessionConfigOptionResponse,
} from '@agentclientprotocol/sdk';
import { agentAdapters } from '@repo/agents';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { requireResourceProcessAt } from '#mocks/acp-resource';

const configuredSessionId = 'configured-session';

it.each(agentAdapters.map(({ agent }) => agent))(
  '%s names an empty Session from its first prompt and keeps that title on later prompts',
  async (agent) => {
    const host = await startAcpEngine({}, undefined, agent);
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
  const host = await startAcpEngine({
    newSession: ({ params }) => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration.map((option) => ({
        ...option,
        description: params.cwd,
      })),
    }),
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
  await feed.return?.();
});

it.each(agentAdapters.map(({ agent }) => agent))(
  '%s applies Fast mode to the actual Session and reports its authoritative response',
  async (agent) => {
    const requests: SetSessionConfigOptionRequest[] = [];
    const host = await startAcpEngine(
      {
        newSession: () => ({
          sessionId: configuredSessionId,
          configOptions: acpConfiguration,
        }),
        setConfigOption: ({ params }) => {
          requests.push(params);
          return {
            configOptions: acpConfiguration.map((option) =>
              option.id === 'fast' && option.type === 'boolean'
                ? { ...option, currentValue: true }
                : option,
            ),
          };
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
  const started = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const order: string[] = [];
  let nextSession = 0;
  const host = await startAcpEngine({
    newSession: () => ({
      sessionId: `configured-${++nextSession}`,
      configOptions: acpConfiguration,
    }),
    setConfigOption: async () => {
      started.resolve();
      await finish.promise;
      order.push('configured');
      return { configOptions: acpConfiguration };
    },
    prompt: ({ params }) => {
      order.push(
        params.prompt[0]?.type === 'text'
          ? params.prompt[0].text
          : 'attachment',
      );
      return { stopReason: 'end_turn' };
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
  expect(order).toEqual(['sibling']);
  finish.resolve();
  await applied;
  await prompt;
  await expect.poll(() => order).toEqual(['sibling', 'configured', 'first']);
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
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
    setConfigOption: () => ({ configOptions: returned }),
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
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
    setConfigOption: () => {
      throw new RequestError(-32602, 'Model unavailable');
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
  const completion = Promise.withResolvers<PromptResponse>();
  const prompted = Promise.withResolvers<void>();
  const order: string[] = [];
  const host = await startAcpEngine({
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
    prompt: () => {
      order.push('prompt');
      prompted.resolve();
      return completion.promise;
    },
    cancel: () => {
      order.push('cancel');
      completion.resolve({ stopReason: 'cancelled' });
    },
    setConfigOption: () => {
      order.push('configuration');
      return { configOptions: acpConfiguration };
    },
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
  expect(order).toEqual(['prompt', 'cancel', 'configuration']);
});

it('initial settings finish before prompted creation dispatches any Agent work', async () => {
  const order: string[] = [];
  const host = await startAcpEngine({
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
    setConfigOption: () => {
      order.push('configuration');
      return { configOptions: acpConfiguration };
    },
    prompt: () => {
      order.push('prompt');
      return { stopReason: 'end_turn' };
    },
  });
  await host.caller.session.new({
    ...emptySessionInput,
    configOptions: [{ configId: 'mode', value: 'plan' }],
    prompt: [{ type: 'text', text: 'Plan first' }],
  });
  await expect.poll(() => order).toEqual(['configuration', 'prompt']);
});

it('explicit closure rejects a pending configuration instead of reporting false success', async () => {
  const started = Promise.withResolvers<void>();
  const completion = Promise.withResolvers<SetSessionConfigOptionResponse>();
  const host = await startAcpEngine({
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
    setConfigOption: () => {
      started.resolve();
      return completion.promise;
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
  completion.resolve({ configOptions: acpConfiguration });
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
    let nextSession = 0;
    const host = await startAcpEngine(
      {
        newSession: () => ({
          sessionId: `configured-${++nextSession}`,
          configOptions: acpConfiguration,
        }),
        setConfigOption: ({ params }) => ({
          configOptions: acpConfiguration.map((option) =>
            option.type === 'select' && option.id === params.configId
              ? { ...option, currentValue: value }
              : option,
          ),
        }),
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
  const started = Promise.withResolvers<void>();
  const finish = Promise.withResolvers<void>();
  const requests: string[] = [];
  const host = await startAcpEngine({
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
    setConfigOption: async ({ params }) => {
      requests.push(params.configId);
      started.resolve();
      await finish.promise;
      return {
        configOptions: acpConfiguration.filter(
          (option) => option.id !== 'effort',
        ),
      };
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
  expect(requests).toEqual(['model']);
});

it('the lifetime subscription applies authoritative configuration updates to the actual Session', async () => {
  const host = await startAcpEngine({
    newSession: () => ({
      sessionId: configuredSessionId,
      configOptions: acpConfiguration,
    }),
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
  await requireResourceProcessAt(host.peer.processes).connection.client.notify(
    'session/update',
    {
      sessionId: configuredSessionId,
      update: { sessionUpdate: 'config_option_update', configOptions: updated },
    },
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
  const closed: string[] = [];
  try {
    const host = await startAcpEngine({
      newSession: () => ({
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
      }),
      closeSession: ({ params }) => {
        closed.push(params.sessionId);
        return {};
      },
    });
    await expect(host.caller.session.new(emptySessionInput)).rejects.toThrow(
      'tone',
    );
    await expect.poll(() => closed).toEqual([configuredSessionId]);
    expect(report).toHaveBeenCalledWith(
      expect.stringMatching(/Rejected Session configuration metadata #1/),
      expect.any(Error),
    );
  } finally {
    report.mockRestore();
  }
});
