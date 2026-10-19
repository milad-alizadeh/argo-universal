import { realpathSync } from 'node:fs';
import {
  type CloseSessionRequest,
  type CreateElicitationResponse,
  type NewSessionRequest,
  type PromptRequest,
  RequestError,
  type RequestPermissionResponse,
} from '@agentclientprotocol/sdk';
import type { SessionAgentOptionsInput } from '@repo/contracts';
import { project, session } from '@repo/db/schema';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import { fixtureAgents } from '@repo/mocks/agent/app-fixtures';
import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { readSessionCheckouts } from '@repo/mocks/git/test-repository';
import { eq } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { emptySessionInput, startAcpEngine } from '#mocks/acp-engine';

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

    const options = await host.caller.session.agentOptions(optionsInput(agent));

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
    host.caller.session.agentOptions(optionsInput('not-installed')),
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

  await host.caller.session.agentOptions(optionsInput());

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
    host.caller.session.agentOptions(optionsInput()),
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

  const reading = host
    .createCaller({ signal: reader.signal })
    .session.agentOptions(optionsInput());

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
    host.caller.session.agentOptions(optionsInput()),
  ).rejects.toMatchObject({ cause: { openError: { type: 'auth-required' } } });
});
