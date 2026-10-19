import type {
  NewSessionRequest,
  PromptRequest,
  SetSessionConfigOptionRequest,
  SessionConfigOption,
} from '@agentclientprotocol/sdk';
import { session } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import {
  appFixtureAgentIds,
  fixtureAgents,
} from '@repo/mocks/agent/app-fixtures';
import { scenarios } from '@repo/mocks/agent/scenarios';
import { eq } from 'drizzle-orm';
import { expect, it, vi } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from '#mocks/acp-feed';
import { requireScriptedProcessAt } from '#mocks/scripted-agent';

const configuredSessionId = 'configured-session';

const unavailableModel = 'Model unavailable';

const cancellationPrompt = 'Wait for cancellation';

it.each(fixtureAgents.map(({ agent }) => agent))(
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

it.each(fixtureAgents.map(({ agent }) => agent))(
  'an empty Session shows configuration returned for its actual Checkout before any prompt',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const openings: NewSessionRequest[] = [];

    const host = await startAcpEngine(
      {
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
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

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
      host.database
        .select({ cwd: session.checkoutPath })
        .from(session)
        .where(eq(session.id, created.sessionId))
        .get()?.cwd,
    );
    await feed.return?.();
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
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

it.each(fixtureAgents.map(({ agent }) => agent))(
  'a subsequent prompt waits for authoritative configuration while another Session can prompt',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
    const finish = Promise.withResolvers<void>();
    const prompts: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
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
      },
      undefined,
      agentId,
    );

    const first = await host.caller.session.new(sessionInput);
    const sibling = await host.caller.session.new(sessionInput);

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
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'the full returned configuration replaces guessed model-dependent choices',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };

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

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            { result: { configOptions: returned } },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

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
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'an upstream configuration rejection leaves the Session actual values unchanged',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            { error: { code: -32602, message: unavailableModel } },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await expect(
      host.caller.session.setConfigOption({
        ...created,
        configId: 'model',
        type: 'id',
        value: 'small',
      }),
    ).rejects.toThrow(unavailableModel);

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

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
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'cancellation bypasses configuration held behind an active prompt',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const prompted = Promise.withResolvers<PromptRequest>();
    const commands: { sessionId: string }[] = [];

    const host = await startAcpEngine(
      {
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
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: cancellationPrompt }],
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
    await waitForAcpSessionIdle(host, created.sessionId);
    expect(commands).toMatchObject([
      { prompt: [{ text: cancellationPrompt }] },
      { sessionId: configuredSessionId },
    ]);
    expect(commands).toHaveLength(2);
    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Continue with held mode' }],
    });
    await expect
      .poll(() => commands)
      .toMatchObject([
        { prompt: [{ text: cancellationPrompt }] },
        { sessionId: configuredSessionId },
        { configId: 'mode', value: 'plan' },
        { prompt: [{ text: 'Continue with held mode' }] },
      ]);
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'initial settings finish before prompted creation dispatches any Agent work',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const commands: { sessionId: string }[] = [];

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [{ requests: commands }],
          'session/prompt': [{ requests: commands }],
        },
      },
      undefined,
      agentId,
    );

    await host.caller.session.new({
      ...sessionInput,
      configOptions: [{ configId: 'mode', value: 'plan' }],
      prompt: [{ type: 'text', text: 'Plan first' }],
    });
    await expect
      .poll(() => commands)
      .toMatchObject([
        { configId: 'mode' },
        { prompt: [{ text: 'Plan first' }] },
      ]);
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'explicit closure rejects a pending configuration instead of reporting false success',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
    const completion = Promise.withResolvers<void>();

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
        responses: {
          'session/set_config_option': [
            { received: started, waitFor: completion.promise },
          ],
        },
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

    const setting = host.caller.session.setConfigOption({
      ...created,
      configId: 'mode',
      type: 'id',
      value: 'plan',
    });

    const settled = Promise.allSettled([setting]);
    await started.promise;
    await host.caller.session.close(created);
    completion.resolve();
    expect(await settled).toMatchObject([
      {
        status: 'rejected',
        reason: { message: 'Session closed before configuration completed' },
      },
    ]);
  },
);

it.each(
  fixtureAgents.flatMap(({ agent }) => [
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

it.each(fixtureAgents.map(({ agent }) => agent))(
  'a queued choice is rechecked after a model removes its offered option',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const started = Promise.withResolvers<SetSessionConfigOptionRequest>();
    const finish = Promise.withResolvers<void>();
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
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

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

    const settled = Promise.allSettled([effort]);
    finish.resolve();
    await model;
    expect(await settled).toMatchObject([
      {
        status: 'rejected',
        reason: { message: expect.stringContaining('effort') },
      },
    ]);
    expect(requests.map((request) => request.configId)).toEqual(['model']);
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'the lifetime subscription applies authoritative configuration updates to the actual Session',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };

    const host = await startAcpEngine(
      {
        steps: [],
        configOptions: acpConfiguration,
        sessionIds: [configuredSessionId],
      },
      undefined,
      agentId,
    );

    const created = await host.caller.session.new(sessionInput);

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

    const feed = (
      await host.caller.feed.subscribe({ ...created, after: null })
    )[Symbol.asyncIterator]();

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
      .toMatchObject({
        type: 'snapshot',
        snapshot: { configOptions: expected },
      });
    await feed.return?.();
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  'malformed Argo configuration metadata is reported, counted and closes the failed opening',
  async (agentId) => {
    const sessionInput = { ...emptySessionInput, agent: agentId };
    const report = vi.spyOn(console, 'error').mockImplementation(() => {});
    const closed: { sessionId: string }[] = [];

    try {
      const host = await startAcpEngine(
        {
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
        },
        undefined,
        agentId,
      );

      await expect(host.caller.session.new(sessionInput)).rejects.toThrow(
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
  },
);

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s delivers a held mode choice in the running Session snapshot',
  async (agent) => {
    const host = await startAcpEngine(scenarios['held-mode'], undefined, agent);

    const created = await host.caller.session.new({
      ...emptySessionInput,
      agent,
    });

    await host.caller.session.prompt({
      ...created,
      prompt: [{ type: 'text', text: 'Report a held mode choice' }],
    });

    const snapshot = await waitForAcpSnapshot(
      host,
      created.sessionId,
      (value) =>
        value.configOptions.some(
          (option) => option._meta?.argo?.heldUntilNextTurn,
        ),
    );

    expect(snapshot.state).toBe('running');
    expect(snapshot.configOptions).toMatchObject([
      { configId: 'model', currentValue: 'large' },
      { configId: 'effort', currentValue: 'high' },
      {
        configId: 'mode',
        currentValue: 'plan',
        _meta: { argo: { heldUntilNextTurn: true } },
      },
      { configId: 'fast', currentValue: false },
    ]);
  },
);

it.each(appFixtureAgentIds)(
  '%s rejects the next prompt when the Agent refuses a held choice before any new Turn is stored',
  async (agent) => {
    const finish = Promise.withResolvers<void>();
    const prompted = Promise.withResolvers<PromptRequest>();
    const prompts: PromptRequest[] = [];

    const host = await startAcpEngine(
      {
        configOptions: acpConfiguration,
        steps: [],
        responses: {
          'session/prompt': [
            { received: prompted, requests: prompts, waitFor: finish.promise },
          ],
          'session/set_config_option': [
            { error: { code: -32602, message: unavailableModel } },
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
    finish.resolve();
    await waitForAcpSessionIdle(host, created.sessionId);
    await expect(
      host.caller.session.prompt({
        ...created,
        prompt: [{ type: 'text', text: 'Next' }],
      }),
    ).rejects.toThrow(unavailableModel);
    expect(prompts).toHaveLength(1);
    expect(
      host.database.$client
        .prepare('SELECT status FROM turn WHERE session_id = ?')
        .all(created.sessionId),
    ).toEqual([{ status: 'ended' }]);
  },
);

it('ignores a cached default removed by the selected model before the first prompt', async () => {
  const requests: SetSessionConfigOptionRequest[] = [];

  const changed = acpConfiguration
    .filter((option) => option.id !== 'fast')
    .map((option) =>
      option.id === 'model' && option.type === 'select'
        ? { ...option, currentValue: 'small' }
        : option,
    );

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [
        { requests, result: { configOptions: changed } },
      ],
    },
  });

  await expect(
    host.caller.session.new({
      ...emptySessionInput,
      configOptions: [
        { configId: 'model', value: 'small' },
        { configId: 'fast', value: false, optional: true },
      ],
    }),
  ).resolves.toHaveProperty('sessionId');
  expect(requests.map(({ configId }) => configId)).toEqual(['model']);
});
