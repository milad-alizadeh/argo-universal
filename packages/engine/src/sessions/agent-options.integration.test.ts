import { realpathSync } from 'node:fs';
import {
  type CloseSessionRequest,
  type CreateElicitationResponse,
  type NewSessionRequest,
  type PromptRequest,
  RequestError,
  type RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import {
  AgentConfiguration,
  type SessionAgentOptionsInput,
  type AgentOptionsUpdate,
  type SessionConfigOption,
} from '@repo/contracts';
import { agentOptions, project, session } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

async function collectOptions(
  stream: Promise<AsyncIterable<AgentOptionsUpdate>>,
): Promise<SessionConfigOption[]> {
  let result: AgentOptionsUpdate['configOptions'] = null;

  for await (const update of await stream) result = update.configOptions;

  return result ?? [];
}

const optionsSessionId = 'options-session';

const optionsInput = (
  agent = emptySessionInput.agent,
): SessionAgentOptionsInput => ({
  projectId: emptySessionInput.projectId,
  agent,
});

// The Agent's answer to `session/new`: its options, after any steps it plays first.
const optionsScenario = (
  closes: CloseSessionRequest[],
  opening: NonNullable<
    NonNullable<ScriptedScenario['responses']>['session/new']
  >[number] = {},
): ScriptedScenario => ({
  steps: [],
  responses: {
    'session/new': [
      {
        result: {
          sessionId: optionsSessionId,
          configOptions: acpConfiguration,
        },
        ...opening,
      },
    ],
    'session/close': [{ requests: closes }],
  },
});

it.each(fixtureAgents.map(({ agent }) => agent))(
  '%s offers its options before Send from an Agent session it closes, leaving no Session or worktree',
  async (agent) => {
    const openings: NewSessionRequest[] = [];
    const closes: CloseSessionRequest[] = [];
    const prompts: PromptRequest[] = [];

    const scenario = optionsScenario(closes, { requests: openings });

    const host = await startAcpEngine(
      {
        ...scenario,
        responses: {
          ...scenario.responses,
          'session/prompt': [{ requests: prompts }],
        },
      },
      undefined,
      agent,
    );

    const storedSessions = (): { id: string }[] =>
      host.database.select({ id: session.id }).from(session).all();

    const before = storedSessions();

    const options = await collectOptions(
      host.caller.session.agentOptions(optionsInput(agent)),
    );

    const projectPath = host.database
      .select({ path: project.path })
      .from(project)
      .where(eq(project.id, emptySessionInput.projectId))
      .get()?.path;

    if (!projectPath) throw new Error('The fixture Project has no folder');
    expect(
      options.map(({ configId, currentValue }) => [configId, currentValue]),
    ).toEqual([
      ['model', 'large'],
      ['effort', 'high'],
      ['mode', 'code'],
      ['fast', false],
    ]);
    expect(openings.map(({ cwd }) => realpathSync(cwd))).toEqual([
      realpathSync(projectPath),
    ]);
    expect(closes).toEqual([{ sessionId: optionsSessionId }]);
    expect(prompts).toEqual([]);
    expect(
      host.database.select().from(agentOptions).get()?.configOptions,
    ).toEqual(options);
    expect(storedSessions()).toEqual(before);
    expect(await readSessionCheckouts(projectPath)).toEqual({
      branches: [],
      worktrees: 1,
    });
  },
);

it('refuses the options of an Agent that is not installed, opening nothing', async () => {
  const openings: NewSessionRequest[] = [];

  const host = await startAcpEngine({
    steps: [],
    responses: { 'session/new': [{ requests: openings }] },
  });

  await expect(
    collectOptions(
      host.caller.session.agentOptions(optionsInput('not-installed')),
    ),
  ).rejects.toThrow('Agent "not-installed" is not installed.');
  expect(openings).toEqual([]);
});

it('refuses a Permission request and an Elicitation the options Agent session asks', async () => {
  const closes: CloseSessionRequest[] = [];
  const permissions: RequestPermissionResponse[] = [];
  const elicitations: CreateElicitationResponse[] = [];

  const host = await startAcpEngine(
    optionsScenario(closes, {
      steps: [
        {
          type: 'permission',
          request: {
            toolCall: { toolCallId: 'write', title: 'Write a file' },
            options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' }],
          },
          responses: permissions,
        },
        {
          type: 'elicitation',
          request: {
            mode: 'form',
            message: 'Which folder?',
            requestedSchema: { type: 'object', properties: {} },
          },
          responses: elicitations,
        },
      ],
    }),
  );

  await collectOptions(host.caller.session.agentOptions(optionsInput()));

  expect(permissions).toEqual([{ outcome: { outcome: 'cancelled' } }]);
  expect(elicitations).toEqual([{ action: 'cancel' }]);
});

it('closes the Agent session when its options cannot be read', async () => {
  const closes: CloseSessionRequest[] = [];

  const host = await startAcpEngine(
    optionsScenario(closes, {
      result: {
        sessionId: optionsSessionId,
        configOptions: [
          {
            id: 'mode',
            name: 'Mode',
            type: 'select',
            currentValue: 'code',
            options: [{ value: 'code', name: 'Code' }],
            _meta: { argo: { tone: 'unknown-tone' } },
          },
        ],
      },
    }),
  );

  await expect(
    collectOptions(host.caller.session.agentOptions(optionsInput())),
  ).rejects.toThrow('tone');
  expect(closes).toEqual([{ sessionId: optionsSessionId }]);
});

it('closes the Agent session that opens after the App stopped waiting for it', async () => {
  const closes: CloseSessionRequest[] = [];
  const opened = Promise.withResolvers<void>();
  const received = Promise.withResolvers<NewSessionRequest>();
  const closed = Promise.withResolvers<CloseSessionRequest>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      ...optionsScenario(closes, { waitFor: opened.promise, received })
        .responses,
      'session/close': [{ requests: closes, received: closed }],
    },
  });

  const reader = new AbortController();

  const reading = collectOptions(
    host
      .createCaller({ signal: reader.signal })
      .session.agentOptions(optionsInput()),
  );

  await received.promise;
  reader.abort();

  await expect(reading).rejects.toThrow('aborted');
  opened.resolve();

  await expect(closed.promise).resolves.toEqual({
    sessionId: optionsSessionId,
  });
});

it('reports an Agent that needs sign-in as Send’s open would', async () => {
  const closes: CloseSessionRequest[] = [];

  const host = await startAcpEngine(
    optionsScenario(closes, {
      error: RequestError.authRequired().toErrorResponse(),
    }),
  );

  await expect(
    collectOptions(host.caller.session.agentOptions(optionsInput())),
  ).rejects.toMatchObject({ cause: { openError: { type: 'auth-required' } } });
});

it('returns persisted options before a silent refresh completes', async () => {
  const openings: NewSessionRequest[] = [];
  const refresh = Promise.withResolvers<void>();

  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        { result: { sessionId: 'first', configOptions: acpConfiguration } },
        {
          waitFor: refresh.promise,
          requests: openings,
          result: { sessionId: 'second', configOptions: acpConfiguration },
        },
      ],
    },
  });

  const first = await collectOptions(
    host.caller.session.agentOptions(optionsInput()),
  );

  const stream = (await host.caller.session.agentOptions(optionsInput()))[
    Symbol.asyncIterator
  ]();

  const cached = await stream.next();
  expect(cached.value).toMatchObject({ configOptions: first });
  const fresh = stream.next();
  await expect.poll(() => openings.length).toBe(1);
  refresh.resolve();
  expect((await fresh).value).toMatchObject({ configOptions: first });
  await stream.return?.();
});

it.each([undefined, 'large'])(
  'preserves newer saved options while discovery returns its explicit pick %s',
  async (model) => {
    const received = Promise.withResolvers<NewSessionRequest>();
    const release = Promise.withResolvers<void>();

    const changed = acpConfiguration
      .filter((option) => option.category === 'model')
      .map((option) =>
        option.id === 'model' && option.type === 'select'
          ? { ...option, currentValue: 'small' }
          : option,
      );

    const host = await startAcpEngine({
      steps: [],
      configOptions: acpConfiguration,
      responses: {
        'session/new': [
          { result: { sessionId: 'actual', configOptions: acpConfiguration } },
          {
            received,
            waitFor: release.promise,
            result: { sessionId: 'discovery', configOptions: acpConfiguration },
          },
        ],
        'session/set_config_option': [{ result: { configOptions: changed } }],
      },
    });

    const created = await host.caller.session.new(emptySessionInput);

    const stream = (
      await host.caller.session.agentOptions({
        ...optionsInput(),
        picks: model ? { model } : undefined,
      })
    )[Symbol.asyncIterator]();

    expect((await stream.next()).value?.configOptions).not.toBeNull();
    const refreshing = stream.next();
    await received.promise;

    const applied = await host.caller.session.setConfigOption({
      ...created,
      configId: 'model',
      type: 'id',
      value: 'small',
    });

    release.resolve();
    const refreshed = (await refreshing).value?.configOptions;
    expect(
      refreshed?.find((option) => option.category === 'model')?.currentValue,
    ).toBe(model ?? 'small');
    expect(
      refreshed?.some((option) => option.category === 'thought_level'),
    ).toBe(model !== undefined);
    await expect
      .poll(
        () => host.database.select().from(agentOptions).get()?.configOptions,
      )
      .toEqual(applied.configOptions);
    await stream.return?.();
  },
);

it('keeps saved options but reports sign-in when background discovery fails', async () => {
  const host = await startAcpEngine({
    steps: [],
    responses: {
      'session/new': [
        { result: { sessionId: 'first', configOptions: acpConfiguration } },
        { error: RequestError.authRequired().toErrorResponse() },
      ],
    },
  });

  const saved = await collectOptions(
    host.caller.session.agentOptions(optionsInput()),
  );

  const stream = (await host.caller.session.agentOptions(optionsInput()))[
    Symbol.asyncIterator
  ]();

  expect((await stream.next()).value?.configOptions).toEqual(saved);
  await expect(stream.next()).rejects.toMatchObject({
    cause: { openError: { type: 'auth-required' } },
  });
  expect(
    host.database.select().from(agentOptions).get()?.configOptions,
  ).toEqual(saved);
});

it('does not recreate saved options when the Agent is removed during discovery', async () => {
  const received = Promise.withResolvers<NewSessionRequest>();
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine(
    optionsScenario([], { received, waitFor: release.promise }),
  );

  const discovery = collectOptions(
    host.caller.session.agentOptions(optionsInput()),
  );

  // Removing an Agent drops its connection, so discovery may be cancelled before its reply.
  const settled = discovery.catch(() => []);
  await received.promise;
  await host.caller.agent.remove({ id: emptySessionInput.agent });
  release.resolve();
  await settled;
  expect(host.database.select().from(agentOptions).all()).toEqual([]);
  expect(await host.caller.agent.list()).toEqual([]);
});

it('refreshes model-dependent options before Send without creating a Session', async () => {
  const changed = acpConfiguration
    .filter((option) => option.category === 'model')
    .map((option) =>
      option.type === 'select' ? { ...option, currentValue: 'small' } : option,
    );

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: {
      'session/set_config_option': [{ result: { configOptions: changed } }],
    },
  });

  const sessionsBefore = host.database.select().from(session).all();

  const options = await collectOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      picks: { model: 'small' },
    }),
  );

  expect(options.map((option) => option.category)).toEqual(['model']);
  expect(options[0]?.currentValue).toBe('small');
  expect(host.database.select().from(session).all()).toEqual(sessionsBefore);
  expect(
    host.database.select().from(agentOptions).get()?.configOptions,
  ).toEqual(options);
});

it('reads a closed Session configuration without resuming it or replacing New Session preferences', async () => {
  const resumes: object[] = [];

  const host = await startAcpEngine({
    steps: [],
    configOptions: acpConfiguration,
    responses: { 'session/resume': [{ requests: resumes }] },
  });

  const created = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Keep this Session' }],
  });

  await host.caller.session.close(created);
  // Another Session changed the Agent's most recent preferences.
  await collectOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      picks: { model: 'small' },
    }),
  );

  const restored = await collectOptions(
    host.caller.session.agentOptions({
      ...optionsInput(),
      sessionId: created.sessionId,
    }),
  );

  expect(
    restored.find((option) => option.configId === 'model')?.currentValue,
  ).toBe('large');
  expect(resumes).toEqual([]);
  const recent = host.database.select().from(agentOptions).get()?.configOptions;
  expect(
    AgentConfiguration.shape.configOptions
      .parse(recent)
      .find((option) => option.configId === 'model')?.currentValue,
  ).toBe('small');
});
